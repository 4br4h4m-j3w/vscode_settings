"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RawTestResult {
    constructor(isPassed, output, failedTests, err) {
        this.isPassed = isPassed;
        this.output = output;
        this.failedTests = failedTests;
        this.err = err;
    }
}
exports.RawTestResult = RawTestResult;
//# sourceMappingURL=rawTestResult.js.map