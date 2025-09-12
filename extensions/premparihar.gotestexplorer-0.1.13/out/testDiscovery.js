"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const vscode = require("vscode");
const testNode_1 = require("./testNode");
const testUtil_1 = require("./lib/testUtil");
const fileSystemProvider_1 = require("./fileSystemProvider");
const config_1 = require("./config");
class TestDiscovery {
    constructor(commands) {
        this.commands = commands;
    }
    discoverAllTests() {
        this.commands.sendTestDiscoveryStarted();
        const workspaceFolder = vscode.workspace.workspaceFolders.filter(folder => folder.uri.scheme === 'file')[0];
        let srcLocation = path.join(workspaceFolder.uri.path, "src");
        fs.exists(srcLocation, (exists) => {
            srcLocation = exists ? srcLocation : workspaceFolder.uri.path;
            const uri = vscode.Uri.file(srcLocation);
            this.discoverTests(uri).catch(err => {
                vscode.window.showErrorMessage('An error occurred: ' + err);
                this.commands.sendDiscoveredTests([]);
            });
        });
    }
    discoverTests(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            const items = yield TestDiscovery.getGoTestFiles(uri);
            let promises = items.map((item) => __awaiter(this, void 0, void 0, function* () {
                let suite = new testNode_1.TestNode(item.name, item.uri);
                let symbols = yield testUtil_1.getTestFunctions(suite.uri, null);
                symbols = symbols.sort((a, b) => a.name.localeCompare(b.name));
                let nodeList = symbols.map(symbol => new testNode_1.TestNode(`${symbol.name}`, suite.uri));
                return new testNode_1.TestNode(suite.name, suite.uri, nodeList);
            }));
            Promise.all(promises).then(testNodeList => {
                this.commands.sendDiscoveredTests([].concat(...testNodeList));
            });
        });
    }
    static getGoTestFiles(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileSystemProvider = new fileSystemProvider_1.FileSystemProvider();
            const children = yield fileSystemProvider.readDirectory(uri);
            const results = this.filterGoTestFileOrDirectory(children);
            let files = results.filter(([name, type]) => type === vscode.FileType.File)
                .map(([name, type]) => ({ name: name, uri: vscode.Uri.file(path.join(uri.fsPath, name)), type }));
            let resultfiles = TestDiscovery.filterOutSkipFolders(results);
            if (resultfiles.length === 0) {
                return Promise.resolve(files);
            }
            var promises = resultfiles.map(([name, type]) => this.getGoTestFiles(vscode.Uri.file(path.join(uri.fsPath, name))));
            return Promise.all(promises).then(results => {
                let output = results.map(r => [].concat(...r));
                return Promise.resolve(files.concat(...output));
            });
        });
    }
    static filterOutSkipFolders(results) {
        return results.filter(([name, type]) => {
            const basename = path.basename(name);
            return type === vscode.FileType.Directory && config_1.Config.SkipFolders.indexOf(basename) === -1;
        });
    }
    static filterGoTestFileOrDirectory(items) {
        return items.filter(([name, type]) => name.endsWith("_test.go")
            && type === vscode.FileType.File
            || type === vscode.FileType.Directory);
    }
}
exports.TestDiscovery = TestDiscovery;
//# sourceMappingURL=testDiscovery.js.map