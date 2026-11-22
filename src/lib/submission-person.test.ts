import assert from "node:assert/strict";
import test from "node:test";
import {
  lookupSubmissionPerson,
  resolveSubmissionPerson,
  SUBMISSION_SOURCE_SITE,
  type SubmissionPersonMatchMode,
  type SubmissionPersonLookupStore,
  type SubmissionPersonStore,
} from "./submission-person.ts";

test("resolves an alternate email before the primary fallback", async () => {
  let primaryLookups = 0;
  const store: SubmissionPersonLookupStore = {
    async findAliasByEmail(email) {
      assert.equal(email, "alternate@example.com");
      return { data: { id: "person-canonical" } };
    },
    async findPrimaryByEmail() {
      primaryLookups += 1;
      return { data: null };
    },
  };

  assert.deepEqual(await lookupSubmissionPerson(store, " Alternate@Example.com "), {
    data: { id: "person-canonical" },
    error: null,
    mode: "alternate",
  });
  assert.equal(primaryLookups, 0);
});

test("falls back to the primary email when no alias row exists", async () => {
  const store: SubmissionPersonLookupStore = {
    async findAliasByEmail() {
      return { data: null };
    },
    async findPrimaryByEmail(email) {
      assert.equal(email, "primary@example.com");
      return { data: { id: "person-primary" } };
    },
  };

  assert.deepEqual(await lookupSubmissionPerson(store, "primary@example.com"), {
    data: { id: "person-primary" },
    error: null,
    mode: "primary",
  });
});

test("preserves a primary alias match reported by the alias store", async () => {
  const store: SubmissionPersonLookupStore = {
    async findAliasByEmail() {
      return { data: { id: "person-primary" }, mode: "primary" };
    },
    async findPrimaryByEmail() {
      throw new Error("primary fallback must not run");
    },
  };

  const result = await lookupSubmissionPerson(store, "primary@example.com");
  assert.equal(result.mode, "primary");
});

test("reuses an existing email without overwriting its canonical identity", async () => {
  let insertCalls = 0;
  const store: SubmissionPersonStore = {
    async findByEmail(email) {
      assert.equal(email, "jordan@acme.example");
      return { data: { id: "person-jordan" } };
    },
    async insert() {
      insertCalls += 1;
      return { data: { id: "wrong" } };
    },
  };

  const result = await resolveSubmissionPerson(store, {
    email: " Jordan@Acme.example ",
    name: "Jordan Blake",
    phone: "+1 555 0123",
  });

  assert.deepEqual(result, {
    data: { id: "person-jordan" },
    error: null,
    mode: "primary",
  });
  assert.equal(insertCalls, 0);
});

test("stores submitted identity fields only when the email is new", async () => {
  const inserted: Record<string, unknown>[] = [];
  const store: SubmissionPersonStore = {
    async findByEmail() {
      return { data: null };
    },
    async insert(patch) {
      inserted.push(patch);
      return { data: { id: "person-new" } };
    },
  };

  const result = await resolveSubmissionPerson(store, {
    email: " new@example.com ",
    name: " New Person ",
    first_name: " New ",
    last_name: " Person ",
    phone: " +1 555 0456 ",
    city: " Lisbon ",
  });

  assert.deepEqual(result, {
    data: { id: "person-new" },
    error: null,
    mode: "created",
  });
  assert.deepEqual(inserted, [{
    email: "new@example.com",
    name: "New Person",
    first_name: "New",
    last_name: "Person",
    phone: "+1 555 0456",
    city: "Lisbon",
    source_site: SUBMISSION_SOURCE_SITE,
  }]);
});

test("recovers when another request inserts the email concurrently", async () => {
  let lookups = 0;
  const store: SubmissionPersonStore = {
    async findByEmail() {
      lookups += 1;
      return lookups === 1
        ? { data: null }
        : { data: { id: "person-concurrent" }, mode: "alternate" };
    },
    async insert() {
      return {
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      };
    },
  };

  const result = await resolveSubmissionPerson(store, {
    email: "concurrent@example.com",
    name: "Concurrent Person",
  });

  assert.deepEqual(result, {
    data: { id: "person-concurrent" },
    error: null,
    mode: "alternate",
  });
  assert.equal(lookups, 2);
});

test("returns lookup and ordinary insert failures", async (t) => {
  await t.test("initial lookup failure", async () => {
    const error = { code: "08006", message: "lookup unavailable" };
    const result = await resolveSubmissionPerson({
      async findByEmail() {
        return { data: null, error };
      },
      async insert() {
        return { data: { id: "wrong" } };
      },
    }, { email: "person@example.com" });
    assert.deepEqual(result, { data: null, error, mode: null });
  });

  await t.test("non-conflict insert failure", async () => {
    const error = { code: "42501", message: "insert denied" };
    const result = await resolveSubmissionPerson({
      async findByEmail() {
        return { data: null };
      },
      async insert() {
        return { data: null, error };
      },
    }, { email: "person@example.com" });
    assert.deepEqual(result, { data: null, error, mode: null });
  });
});

test("returns the right error when conflict recovery fails", async (t) => {
  const conflict = { code: "23505", message: "duplicate key" };

  await t.test("second lookup error", async () => {
    const lookupError = { code: "08006", message: "lookup unavailable" };
    let lookups = 0;
    const result = await resolveSubmissionPerson({
      async findByEmail() {
        lookups += 1;
        return lookups === 1
          ? { data: null }
          : { data: null, error: lookupError };
      },
      async insert() {
        return { data: null, error: conflict };
      },
    }, { email: "person@example.com" });
    assert.deepEqual(result, { data: null, error: lookupError, mode: null });
  });

  await t.test("second lookup still empty", async () => {
    const result = await resolveSubmissionPerson({
      async findByEmail() {
        return { data: null };
      },
      async insert() {
        return { data: null, error: conflict };
      },
    }, { email: "person@example.com" });
    assert.deepEqual(result, { data: null, error: conflict, mode: null });
  });
});

test("reuses an alternate match without inserting or mutating the canonical row", async () => {
  let insertCalls = 0;
  const submitted: SubmissionPersonMatchMode[] = [];
  const store: SubmissionPersonStore = {
    async findByEmail() {
      return { data: { id: "person-canonical" }, mode: "alternate" };
    },
    async insert() {
      insertCalls += 1;
      return { data: { id: "must-not-be-created" } };
    },
  };

  const result = await resolveSubmissionPerson(store, {
    email: "alternate@example.com",
    name: "Untrusted Replacement",
    phone: "+1 555 0999",
  });
  if (result.mode) submitted.push(result.mode);

  assert.deepEqual(result, {
    data: { id: "person-canonical" },
    error: null,
    mode: "alternate",
  });
  assert.deepEqual(submitted, ["alternate"]);
  assert.equal(insertCalls, 0);
});
