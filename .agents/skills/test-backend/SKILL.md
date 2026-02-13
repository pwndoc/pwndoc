---
name: test-backend
description: >
  Generates backend API integration tests for PwnDoc using Jest and supertest.
  Tests run against an ephemeral MongoDB instance via ./pwndoc-cli test --backend.
context: fork
agent: general-purpose
allowed-tools:
  - Bash
  - Glob
  - Grep
  - Read
  - Write
  - Edit
argument-hint: "[feature-name]"
---

# Backend Test Generator

You generate backend API integration tests for PwnDoc. Tests use Jest + supertest against an Express app with an ephemeral MongoDB.

## Arguments

`$ARGUMENTS` - The feature/resource name to test (e.g., "image", "client", "audit").

## Step 1: Read Source and Reference Files

Before writing any tests, ALWAYS read:

1. The route file being tested: `backend/src/routes/$0.js`
2. The model file (if exists): `backend/src/models/$0.js`
3. An existing test for reference patterns: `backend/tests/client.test.js`
4. The test entry point to understand ordering: `backend/tests/index.test.js`
5. Check if a test already exists: `backend/tests/$0.test.js`

If a test file already exists, read it and augment it rather than replacing it.

## Step 2: Generate the Test File

Write the test to `backend/tests/$0.test.js`.

### Required File Structure

Every backend test file exports a function that receives `request` and `app`:

```javascript
/*
  State after tests:
  {Describe the expected data state after all tests run.
   This is critical because tests run sequentially and share the MongoDB.}
*/

module.exports = function(request, app) {
  describe('{Feature} Suite Tests', () => {
    var userToken = '';
    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      userToken = response.body.datas.token
    })

    describe('{Feature} CRUD operations', () => {
      var item1Id = ""

      // Tests here...
    })
  })
}
```

### Authentication Pattern

All authenticated requests use cookie-based JWT:
```javascript
var response = await request(app).get('/api/{resource}')
  .set('Cookie', [`token=JWT ${userToken}`])
```

### Assertion Patterns

- `expect(response.status).toBe(XXX)` for HTTP status codes
- `expect(response.body.datas)` to access response data (NOTE: `datas` not `data`)
- Common statuses: 200 (OK), 201 (Created), 400 (Bad params), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 422 (Validation error), 500 (Internal)

### Test Categories to Cover

For each resource, generate tests for:

1. **Read (empty state)** - GET when no records exist
2. **Create** - POST with valid data, POST with missing required fields, POST with duplicates
3. **Read (with data)** - GET all, GET by ID
4. **Update** - PUT with valid changes, PUT with invalid/nonexistent ID
5. **Delete** - DELETE existing, DELETE nonexistent
6. **Edge cases** - Based on route validation logic (read the route file!)

### Key Conventions

- Tests run SEQUENTIALLY and share the same MongoDB. Order matters.
- IDs are stored in variables and reused across tests within a describe block.
- The comment at the top documents expected state after all tests run (critical for downstream tests).
- Admin password in tests is `Admin123` (set by `user.test.js` which always runs first).
- Test users created by user.test.js: admin, user2, report, reviewer.
- Use descriptive test names that explain the scenario.

## Step 3: Register in index.test.js

After creating the test file, add the require statement in `backend/tests/index.test.js` in the appropriate position. Respect data dependencies — if your test needs data created by another test, place it after that test.

## Step 4: Run and Fix

If `$ARGUMENTS` contains `--no-run`, **STOP HERE**. Do not run tests — the calling orchestrator will handle test execution. Strip `--no-run` from arguments before processing the feature name in earlier steps.

Otherwise, run tests with:
```bash
./pwndoc-cli test --backend
```

If tests fail, read the error output, fix the test file, and re-run. Iterate until all tests pass.

## Reference

See the template in [template-route-test.md](template-route-test.md) for a complete scaffold.
