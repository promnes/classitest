import { describe, expect, it } from "@jest/globals";

type HelperType = "unassigned" | "parent" | "teacher";

type HelpRequest = {
  id: string;
  taskId: string;
  childId: string;
  helperType: HelperType;
  helperId: string;
  status: "active" | "resolved";
  createdAt: Date;
  resolvedAt?: Date;
};

type HelpMessage = {
  helpRequestId: string;
  senderType: "child" | "parent" | "teacher";
  messageType: "text" | "image" | "voice";
  content?: string | null;
  mediaUrl?: string | null;
};

const HELP_TIMEOUT_SECONDS = 60;

function claimHelpRequest(req: HelpRequest, role: "parent" | "teacher", actorId: string) {
  if (req.status !== "active") return { ok: false, code: 409 };
  if (req.helperType === role && req.helperId === actorId) return { ok: true, code: 200 };
  if (req.helperType !== "unassigned" || req.helperId !== "") return { ok: false, code: 409 };
  req.helperType = role;
  req.helperId = actorId;
  return { ok: true, code: 200 };
}

function autoAssignIfExpired(
  req: HelpRequest,
  now: Date,
  options: { teacherEligible: boolean; defaultParentId: string; teacherId: string }
) {
  if (req.status !== "active") return;
  if (req.helperType !== "unassigned" || req.helperId !== "") return;
  const ageMs = now.getTime() - req.createdAt.getTime();
  if (ageMs < HELP_TIMEOUT_SECONDS * 1000) return;

  if (options.teacherEligible) {
    req.helperType = "teacher";
    req.helperId = options.teacherId;
    return;
  }
  req.helperType = "parent";
  req.helperId = options.defaultParentId;
}

function sendChildMessage(req: HelpRequest, messages: HelpMessage[], msg: Omit<HelpMessage, "senderType">) {
  if (req.status !== "active") throw new Error("request not active");
  messages.push({ ...msg, senderType: "child" });
}

function resolveHelpRequest(req: HelpRequest) {
  if (req.status === "resolved") return;
  req.status = "resolved";
  req.resolvedAt = new Date();
}

describe("Help flow e2e", () => {
  it("child help flow supports first-claim winner, all media types, and resolve", () => {
    const request: HelpRequest = {
      id: "hr-1",
      taskId: "task-1",
      childId: "child-1",
      helperType: "unassigned",
      helperId: "",
      status: "active",
      createdAt: new Date(),
    };
    const messages: HelpMessage[] = [];

    const parentClaim = claimHelpRequest(request, "parent", "parent-1");
    expect(parentClaim.ok).toBe(true);
    expect(parentClaim.code).toBe(200);

    const teacherClaim = claimHelpRequest(request, "teacher", "teacher-1");
    expect(teacherClaim.ok).toBe(false);
    expect(teacherClaim.code).toBe(409);

    sendChildMessage(request, messages, {
      helpRequestId: request.id,
      messageType: "text",
      content: "محتاج شرح للسؤال",
      mediaUrl: null,
    });

    sendChildMessage(request, messages, {
      helpRequestId: request.id,
      messageType: "image",
      content: "صورة الحل",
      mediaUrl: "/uploads/help-chat/image-1.png",
    });

    sendChildMessage(request, messages, {
      helpRequestId: request.id,
      messageType: "voice",
      content: "تسجيل صوتي",
      mediaUrl: "/uploads/help-chat/voice-1.webm",
    });

    // drawing is sent as image message in current implementation
    sendChildMessage(request, messages, {
      helpRequestId: request.id,
      messageType: "image",
      content: "رسم",
      mediaUrl: "/uploads/help-chat/drawing-1.png",
    });

    expect(messages).toHaveLength(4);
    expect(messages.map((m) => m.messageType)).toEqual(["text", "image", "voice", "image"]);

    resolveHelpRequest(request);
    expect(request.status).toBe("resolved");
    expect(request.resolvedAt).toBeDefined();
  });

  it("auto-assigns expired unclaimed requests to teacher when eligible, otherwise parent", () => {
    const oldRequestTeacher: HelpRequest = {
      id: "hr-2",
      taskId: "task-2",
      childId: "child-2",
      helperType: "unassigned",
      helperId: "",
      status: "active",
      createdAt: new Date(Date.now() - 70_000),
    };

    autoAssignIfExpired(oldRequestTeacher, new Date(), {
      teacherEligible: true,
      defaultParentId: "parent-2",
      teacherId: "teacher-2",
    });

    expect(oldRequestTeacher.helperType).toBe("teacher");
    expect(oldRequestTeacher.helperId).toBe("teacher-2");

    const oldRequestParent: HelpRequest = {
      id: "hr-3",
      taskId: "task-3",
      childId: "child-3",
      helperType: "unassigned",
      helperId: "",
      status: "active",
      createdAt: new Date(Date.now() - 70_000),
    };

    autoAssignIfExpired(oldRequestParent, new Date(), {
      teacherEligible: false,
      defaultParentId: "parent-3",
      teacherId: "teacher-3",
    });

    expect(oldRequestParent.helperType).toBe("parent");
    expect(oldRequestParent.helperId).toBe("parent-3");
  });
});
