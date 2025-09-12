"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icons_1 = require("./icons");
class TestNode {
    constructor(name, uri, _children) {
        this.name = name;
        this.uri = uri;
        this._children = _children;
    }
    get isTestSuite() {
        return this._children && this._children.length > 0;
    }
    get tooltip() {
        return `${this.name}`;
    }
    set testResult(testResult) {
        this._testResult = testResult;
        this.loadingCompleted();
    }
    get testResult() {
        return this._testResult;
    }
    get icon() {
        return this._isLoading ? icons_1.Icons.loading :
            this.isTestSuite ? this.getTestSuiteIcon :
                !this.testResult ? icons_1.Icons.test :
                    this.testResult.isPassed ? icons_1.Icons.testPassed :
                        icons_1.Icons.testFailed;
    }
    get children() {
        return this._children ? this._children : [];
    }
    get isLoading() {
        return this._isLoading;
    }
    get getTestSuiteIcon() {
        if (this.children.filter(x => x.isLoading).length > 0) {
            return icons_1.Icons.loading;
        }
        for (let index = 0; index < this.children.length; index++) {
            const testResult = this.children[index].testResult;
            if (!testResult) {
                return icons_1.Icons.testSuite;
            }
            if (!testResult.isPassed) {
                return icons_1.Icons.testSuiteFailed;
            }
        }
        return icons_1.Icons.testSuitePassed;
    }
    setLoading() {
        this._isLoading = true;
    }
    loadingCompleted() {
        this._isLoading = false;
    }
}
exports.TestNode = TestNode;
//# sourceMappingURL=testNode.js.map