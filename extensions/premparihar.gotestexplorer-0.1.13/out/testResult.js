"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TestResult {
    constructor(uri, testName, isPassed, output, error) {
        this.uri = uri;
        this.testName = testName;
        this.isPassed = isPassed;
        this.output = output;
        this.error = error;
    }
}
exports.TestResult = TestResult;
//# sourceMappingURL=testResult.js.map