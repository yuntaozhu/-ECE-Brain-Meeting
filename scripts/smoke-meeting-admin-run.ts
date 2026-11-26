import assert from "assert";
import {
  createSession,
  listExperts,
  listTopics,
  patchSession,
  resetAdminProductForTests,
  setExpertEnabled,
  upsertTopic
} from "../server/lib/meetingAdminStore";

resetAdminProductForTests("dazhi");
resetAdminProductForTests("xiaoxing");

const dz = listExperts("dazhi");
assert.ok(dz.length >= 3);
assert.ok(dz.every((e) => e.name));

const xz = listExperts("xiaoxing");
assert.ok(xz.length >= 2);
assert.ok(xz[0].name.includes("顾问") || xz[0].category);

const topics = listTopics("dazhi", { audience: "园长" });
assert.ok(topics.length >= 1);

const t = upsertTopic("dazhi", {
  title: "smoke 议题",
  discussion: "仅测试",
  audiences: ["园长"],
  projectTag: "smoke"
});
assert.equal(t.title, "smoke 议题");

const session = createSession("dazhi", {
  title: "全国美语会议-smoke",
  meetingType: "讨论会议",
  audiences: ["园长"],
  expertId: dz[0].id,
  topicIds: [topics[0].id, t.id]
});
assert.equal(session.status, "waiting");
assert.ok(session.openingPrompt.includes("小智") || session.openingPrompt.length > 20);

const live = patchSession("dazhi", session.id, { status: "live", agendaIndex: 0 });
assert.equal(live?.status, "live");

const toggled = setExpertEnabled("dazhi", dz[0].id, false);
assert.equal(toggled?.enabled, false);

const xs = createSession("xiaoxing", {
  title: "农服周会-smoke",
  expertId: xz[0].id,
  topicIds: listTopics("xiaoxing").slice(0, 1).map((x) => x.id)
});
assert.ok(xs.openingPrompt.includes("小星"));

console.log(
  JSON.stringify({
    ok: true,
    dazhiExperts: dz.length,
    xiaoxingExperts: xz.length,
    sessionId: session.id,
    xSessionId: xs.id
  })
);
