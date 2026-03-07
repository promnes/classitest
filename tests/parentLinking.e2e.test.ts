import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

type MockState = {
  notifications: any[];
  parentLinkRequests: any[];
  parentChild: any[];
  parentParentSync: any[];
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getTableName(table: any): string {
  if (!table) return "";
  const nameSymbol = Object.getOwnPropertySymbols(table).find(
    (sym) => String(sym) === "Symbol(drizzle:Name)"
  );
  if (nameSymbol) {
    return table[nameSymbol] || "";
  }
  return "";
}

function createMockDb(state: MockState) {
  const api = {
    transactionCount: 0,

    transaction: async (callback: (tx: any) => Promise<any>) => {
      api.transactionCount += 1;
      return callback(api);
    },

    select: (_shape?: any) => {
      const context: { table?: any; limit?: number } = {};
      const builder: any = {
        from(table: any) {
          context.table = table;
          return builder;
        },
        where(_condition: any) {
          return builder;
        },
        orderBy(_value: any) {
          return builder;
        },
        limit(limit: number) {
          context.limit = limit;
          return builder;
        },
        then(resolve: any, reject: any) {
          try {
            let rows: any[] = [];
            const tableName = getTableName(context.table);
            if (tableName === "notifications") rows = clone(state.notifications);
            if (tableName === "parent_link_requests") rows = clone(state.parentLinkRequests);
            if (tableName === "parent_child") rows = clone(state.parentChild);
            if (tableName === "parent_parent_sync") rows = clone(state.parentParentSync);
            if (typeof context.limit === "number") rows = rows.slice(0, context.limit);
            return Promise.resolve(rows).then(resolve, reject);
          } catch (error) {
            return Promise.reject(error).then(resolve, reject);
          }
        },
      };
      return builder;
    },

    update: (table: any) => {
      const context: { values?: any; shouldReturn?: boolean } = {};
      const builder: any = {
        set(values: any) {
          context.values = values;
          return builder;
        },
        where(_condition: any) {
          return builder;
        },
        returning() {
          context.shouldReturn = true;
          return builder;
        },
        then(resolve: any, reject: any) {
          try {
            const values = context.values || {};
            let target: any[] = [];
            const tableName = getTableName(table);
            if (tableName === "notifications") target = state.notifications;
            if (tableName === "parent_link_requests") target = state.parentLinkRequests;
            if (tableName === "parent_child") target = state.parentChild;
            if (tableName === "parent_parent_sync") target = state.parentParentSync;

            const updatedRows = target.map((row) => Object.assign(row, values));
            const payload = context.shouldReturn ? clone(updatedRows) : [];
            return Promise.resolve(payload).then(resolve, reject);
          } catch (error) {
            return Promise.reject(error).then(resolve, reject);
          }
        },
      };
      return builder;
    },

    insert: (table: any) => {
      const context: { values?: any; shouldReturn?: boolean } = {};
      const builder: any = {
        values(values: any) {
          context.values = values;
          return builder;
        },
        returning() {
          context.shouldReturn = true;
          return builder;
        },
        then(resolve: any, reject: any) {
          try {
            const input = context.values;
            const rows = Array.isArray(input) ? input : [input];
            const preparedRows = rows.map((row: any, index: number) => ({
              id: row?.id || `generated-${Date.now()}-${index}`,
              ...row,
            }));

            const tableName = getTableName(table);
            if (tableName === "parent_child") state.parentChild.push(...preparedRows);
            if (tableName === "parent_parent_sync") state.parentParentSync.push(...preparedRows);

            const payload = context.shouldReturn ? clone(preparedRows) : [];
            return Promise.resolve(payload).then(resolve, reject);
          } catch (error) {
            return Promise.reject(error).then(resolve, reject);
          }
        },
      };
      return builder;
    },
  };

  return api;
}

describe("Parent linking respond-link flow", () => {
  const createNotificationMock = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    createNotificationMock.mockReset();
    process.env.JWT_SECRET = "test-jwt-secret";
  });

  it("approves pending link requests atomically and creates sync link", async () => {
    const state: MockState = {
      notifications: [
        {
          id: "notif-1",
          parentId: "parent-primary",
          type: "parent_link_request",
          isRead: false,
          status: "pending",
          metadata: {
            linkRequestIds: ["req-1"],
            requestingParentId: "parent-secondary",
            childrenIds: ["child-1"],
            childrenNames: "Mina",
          },
        },
      ],
      parentLinkRequests: [
        {
          id: "req-1",
          requestingParentId: "parent-secondary",
          primaryParentId: "parent-primary",
          childId: "child-1",
          status: "pending",
        },
      ],
      parentChild: [],
      parentParentSync: [],
    };

    const db = createMockDb(state);

    jest.unstable_mockModule("../server/storage", () => ({
      storage: { db },
    }));

    jest.unstable_mockModule("../server/notifications", () => ({
      createNotification: createNotificationMock,
    }));

    jest.unstable_mockModule("../server/utils/rateLimiters", () => ({
      parentLinkingLimiter: (_req: any, _res: any, next: any) => next(),
    }));

    const { default: parentLinkingRouter } = await import("../server/routes/parent-linking");

    const app = express();
    app.use(express.json());
    app.use("/api", parentLinkingRouter);

    const token = jwt.sign(
      { parentId: "parent-primary", userId: "parent-primary", type: "parent" },
      process.env.JWT_SECRET as string
    );

    const response = await request(app)
      .post("/api/parent/notifications/notif-1/respond-link")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "approve" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.approved).toBe(true);
    expect(response.body.data.linkedChildren).toBe(1);

    expect(db.transactionCount).toBe(1);

    expect(state.notifications[0].isRead).toBe(true);
    expect(state.notifications[0].status).toBe("approved");

    expect(state.parentLinkRequests[0].status).toBe("approved");

    expect(state.parentChild).toHaveLength(1);
    expect(state.parentChild[0].parentId).toBe("parent-secondary");
    expect(state.parentChild[0].childId).toBe("child-1");
    expect(state.parentChild[0].relationshipRole).toBe("co_guardian");

    expect(state.parentParentSync).toHaveLength(1);
    expect(state.parentParentSync[0].primaryParentId).toBe("parent-primary");
    expect(state.parentParentSync[0].secondaryParentId).toBe("parent-secondary");
    expect(state.parentParentSync[0].syncStatus).toBe("active");

    expect(createNotificationMock).toHaveBeenCalledTimes(1);
    const firstNotificationPayload = createNotificationMock.mock.calls[0]?.[0] as any;
    expect(firstNotificationPayload.parentId).toBe("parent-secondary");
  });
});
