import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { storage } from "../storage";
import { media, mediaEvents, mediaReferences } from "../../shared/schema";
import { ObjectStorageService } from "../replit_integrations/object_storage/objectStorage";
import type { ObjectAclPolicy } from "../replit_integrations/object_storage/objectAcl";
import type { Media, FinalizeUploadInput } from "../../shared/media";

type MediaRow = typeof media.$inferSelect;

type Actor = { type: "admin" | "parent"; id: string };

const objectStorageService = new ObjectStorageService();
const db = storage.db;

const DEFAULT_PURGE_DAYS = Number(process.env.MEDIA_PURGE_DAYS || "7");

type PurposePolicy = {
  allowMime: RegExp;
  maxSizeBytes: number;
  visibility: ObjectAclPolicy["visibility"];
};

// Purpose-based policy; can be extended safely without breaking callers
const PURPOSE_POLICIES: Record<string, PurposePolicy> = {
  task_media: {
    allowMime: /^(image|video)\//,
    maxSizeBytes: 25 * 1024 * 1024,
    visibility: "private",
  },
  answer_media: {
    allowMime: /^(image|video)\//,
    maxSizeBytes: 25 * 1024 * 1024,
    visibility: "private",
  },
  default: {
    allowMime: /^(image|video)\//,
    maxSizeBytes: 25 * 1024 * 1024,
    visibility: "private",
  },
};

function getPolicy(purpose: string): PurposePolicy {
  return PURPOSE_POLICIES[purpose] || PURPOSE_POLICIES.default;
}

function toMediaResponse(row: MediaRow): Media {
  return {
    id: row.id,
    url: row.url,
    objectKey: row.objectKey,
    storageProvider: "object_storage",
    mimeType: row.mimeType,
    size: row.size,
    checksum: row.checksum || undefined,
    dedupeKey: row.dedupeKey || undefined,
    durationMs: row.durationMs || undefined,
    height: row.height || undefined,
    width: row.width || undefined,
    scanStatus: (row.scanStatus as Media["scanStatus"]) || undefined,
    createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    deletedAt: row.deletedAt?.toISOString?.(),
  };
}

export async function createPresignedUpload({
  actor,
  purpose,
  contentType,
  size,
}: {
  actor: Actor;
  purpose: string;
  contentType: string;
  size: number;
}) {
  const policy = getPolicy(purpose);
  if (!policy.allowMime.test(contentType)) {
    throw new Error("POLICY_REJECTED_MIME");
  }
  if (size > policy.maxSizeBytes) {
    throw new Error("POLICY_REJECTED_SIZE");
  }

  const uploadURL = await objectStorageService.getObjectEntityUploadURL();

  // Local fallback: swap sentinel URL to a real server endpoint
  let finalUploadURL = uploadURL;
  if (uploadURL.startsWith("__local__://")) {
    const objectId = uploadURL.slice("__local__://".length);
    finalUploadURL = `/api/uploads/direct/${objectId}`;
  }

  const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

  return {
    uploadURL: finalUploadURL,
    objectPath,
    metadata: { purpose, contentType, size },
  };
}

export async function finalizeUpload({
  actor,
  input,
}: {
  actor: Actor;
  input: FinalizeUploadInput;
}): Promise<Media> {
  const policy = getPolicy(input.purpose);
  if (!policy.allowMime.test(input.mimeType)) {
    throw new Error("POLICY_REJECTED_MIME");
  }
  if (input.size > policy.maxSizeBytes) {
    throw new Error("POLICY_REJECTED_SIZE");
  }

  const dedupeKey = input.dedupeKey?.trim();

  if (dedupeKey) {
    const [existing] = await db
      .select()
      .from(media)
      .where(
        and(
          eq(media.ownerId, actor.id),
          eq(media.dedupeKey, dedupeKey),
          isNull(media.deletedAt)
        )
      );

    if (existing) {
      return toMediaResponse(existing);
    }
  }

  const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
    input.objectPath,
    { visibility: policy.visibility, owner: actor.id }
  );

  const objectKey = normalizedPath.startsWith("/objects/")
    ? normalizedPath.slice("/objects/".length)
    : normalizedPath;

  const purgeAt = new Date(Date.now() + DEFAULT_PURGE_DAYS * 24 * 60 * 60 * 1000);

  const insertedRows = await db
    .insert(media)
    .values({
      objectKey,
      url: normalizedPath,
      storageProvider: "object_storage",
      mimeType: input.mimeType,
      size: input.size,
      ownerType: actor.type,
      ownerId: actor.id,
      dedupeKey,
      scanStatus: "pending",
      purgeAt,
    })
    .onConflictDoNothing({
      target: [media.ownerId, media.dedupeKey],
      where: isNotNull(media.dedupeKey),
    })
    .returning();

  const wasInserted = Boolean(insertedRows[0]);
  let created = insertedRows[0];

  if (!created && dedupeKey) {
    const [existing] = await db
      .select()
      .from(media)
      .where(
        and(
          eq(media.ownerId, actor.id),
          eq(media.dedupeKey, dedupeKey),
          isNull(media.deletedAt)
        )
      );
    if (existing) {
      created = existing;
    }
  }

  if (!created) {
    throw new Error("MEDIA_FINALIZE_FAILED");
  }

  if (created && wasInserted) {
    await db.insert(mediaEvents).values({
      mediaId: created.id,
      actorType: actor.type,
      actorId: actor.id,
      action: "FINALIZED",
      meta: { purpose: input.purpose, originalName: input.originalName },
    });
  }

  return toMediaResponse(created);
}

export async function attachMedia({
  actor,
  mediaId,
  entityType,
  entityId,
  field,
}: {
  actor: Actor;
  mediaId: string;
  entityType: string;
  entityId: string;
  field: string;
}) {
  const [m] = await db.select().from(media).where(and(eq(media.id, mediaId), isNull(media.deletedAt)));
  if (!m) throw new Error("MEDIA_NOT_FOUND");
  if (m.ownerType && m.ownerType !== actor.type) {
    throw new Error("MEDIA_OWNER_MISMATCH");
  }
  if (m.ownerId && m.ownerId !== actor.id && actor.type !== "admin") {
    throw new Error("MEDIA_OWNER_MISMATCH");
  }

  const inserted = await db
    .insert(mediaReferences)
    .values({ mediaId, entityType, entityId, field })
    .onConflictDoNothing({
      target: [
        mediaReferences.mediaId,
        mediaReferences.entityType,
        mediaReferences.entityId,
        mediaReferences.field,
      ],
      where: isNull(mediaReferences.deletedAt),
    })
    .returning();

  let ref = inserted[0];

  if (!ref) {
    const [existing] = await db
      .select()
      .from(mediaReferences)
      .where(
        and(
          eq(mediaReferences.mediaId, mediaId),
          eq(mediaReferences.entityType, entityType),
          eq(mediaReferences.entityId, entityId),
          eq(mediaReferences.field, field),
          isNull(mediaReferences.deletedAt)
        )
      );

    if (!existing) {
      throw new Error("MEDIA_ATTACH_FAILED");
    }

    ref = existing;
  }

  if (inserted[0]) {
    await db.insert(mediaEvents).values({
      mediaId,
      actorType: actor.type,
      actorId: actor.id,
      action: "ATTACHED",
      meta: { entityType, entityId, field },
    });
  }

  return ref;
}

export async function detachMedia({
  actor,
  mediaId,
  referenceId,
}: {
  actor: Actor;
  mediaId: string;
  referenceId: string;
}) {
  const [m] = await db.select().from(media).where(eq(media.id, mediaId));
  if (!m) throw new Error("MEDIA_NOT_FOUND");
  if (m.ownerId && m.ownerId !== actor.id && actor.type !== "admin") {
    throw new Error("MEDIA_OWNER_MISMATCH");
  }

  await db
    .update(mediaReferences)
    .set({ deletedAt: new Date() })
    .where(and(eq(mediaReferences.id, referenceId), eq(mediaReferences.mediaId, mediaId)));

  await db.insert(mediaEvents).values({
    mediaId,
    actorType: actor.type,
    actorId: actor.id,
    action: "DETACHED",
    meta: { referenceId },
  });
}

export async function softDeleteMedia({
  actor,
  mediaId,
}: {
  actor: Actor;
  mediaId: string;
}) {
  const [m] = await db.select().from(media).where(eq(media.id, mediaId));
  if (!m) throw new Error("MEDIA_NOT_FOUND");
  if (m.ownerId && m.ownerId !== actor.id && actor.type !== "admin") {
    throw new Error("MEDIA_OWNER_MISMATCH");
  }

  const purgeAt = new Date(Date.now() + DEFAULT_PURGE_DAYS * 24 * 60 * 60 * 1000);

  await db
    .update(media)
    .set({ deletedAt: new Date(), purgeAt })
    .where(eq(media.id, mediaId));

  await db.insert(mediaEvents).values({
    mediaId,
    actorType: actor.type,
    actorId: actor.id,
    action: "SOFT_DELETED",
    meta: { purgeAt: purgeAt.toISOString() },
  });
}
