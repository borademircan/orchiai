# Test Quick Start Guide

**Quick Reference for Running Tests**

---

## Prerequisites

1. **Start Backend Server**
   ```bash
   cd /var/www/www.orchiai.com
   npm run backend:dev
   ```

2. **Verify Server is Running**
   ```bash
   curl http://localhost:3001/health
   ```

---

## Running Tests

### Option 1: Run All Tests (Recommended)
```bash
./scripts/test-all.sh
```
Runs all test suites in sequence:
- Phase 3 CRUD tests
- Phase 3 Additional tests
- Phase 4 Execution tests
- Integration tests

### Option 2: Run Individual Test Suites

**Phase 4 Execution Features** (14 endpoints)
```bash
./scripts/test-phase4-execution.sh
```

**Integration Tests** (Component workflows)
```bash
./scripts/test-integration.sh
```

**Phase 3 CRUD Tests** (76 endpoints)
```bash
./scripts/test-api.sh
```

**Phase 3 Additional Tests** (Edge cases)
```bash
./scripts/test-additional-fixed.sh
```

---

## Test Output

### Success Indicators
- ✅ Green "PASS" messages
- Test summary shows all passed
- Exit code 0

### Failure Indicators
- ❌ Red "FAIL" messages
- Test summary shows failures
- Exit code 1
- Error logs in `/tmp/orchiai-tests-*/`

---

## Manual Testing

### Using VS Code REST Client
1. Open `api-tests.http`
2. Install REST Client extension (if not installed)
3. Click "Send Request" above each request
4. Replace placeholder IDs with actual IDs from responses

### Using curl
```bash
# Example: Execute agent
curl -X POST http://localhost:3001/api/v1/agents/{agent-id}/execute \
  -H "Content-Type: application/json" \
  -d '{"userMessage": "Hello"}'
```

---

## Test Results Location

- Phase 4 tests: `/tmp/orchiai-tests-phase4/`
- Integration tests: `/tmp/orchiai-tests-integration/`
- Phase 3 tests: `/tmp/orchiai-tests/`

Each directory contains:
- `response_*.json` - Successful responses
- `error_*.txt` - Error logs

---

## Common Issues

### Server Not Running
```
Error: Server not running at http://localhost:3001
```
**Solution**: Start server with `npm run backend:dev`

### Invalid API Keys
Some tests may fail with invalid API keys (expected for structural tests):
- Model connection tests
- Agent execution tests

These verify error handling, not functionality.

### Test Data Not Cleaned
Tests create temporary data. Consider:
- Using a test database
- Manually cleaning up after tests

---

## Test Coverage

- **Total Endpoints**: 90
- **Phase 3 CRUD**: 76 endpoints (78.9% tested)
- **Phase 4 Execution**: 14 endpoints (100% tested)
- **Overall Coverage**: 82.2%

---

## Next Steps

1. Review test results
2. Check error logs for failures
3. Verify test data cleanup
4. Run performance tests (if needed)
5. Review comprehensive test plan: `Project/COMPREHENSIVE-TEST-PLAN.md`

---

**Last Updated**: 2025-01-27

