"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const vscode = require("vscode");
const path = require("path");
const os = require("os");
const util = require("util");
const goOutline_1 = require("./goOutline");
const goPath_1 = require("./goPath");
const utils_1 = require("./utils");
const rawTestResult_1 = require("../rawTestResult");
//const testSuiteMethodRegex = /^\(([^)]+)\)\.(Test.*)$/;
const sendSignal = 'SIGKILL';
/**
 *  testProcesses holds a list of currently running test processes.
 */
const runningTestProcesses = [];
let toolsGopath;
const outputChannel = vscode.window.createOutputChannel('Go Test Explorer');
function getTestFunctions(uri, token) {
    let documentSymbolProvider = new goOutline_1.GoDocumentSymbolProvider();
    return documentSymbolProvider
        .provideDocumentSymbols(uri, token)
        .then(symbols => symbols.filter(sym => sym.kind === vscode.SymbolKind.Function
        && (sym.name.startsWith('Test'))));
}
exports.getTestFunctions = getTestFunctions;
function getBinPath(tool) {
    return goPath_1.getBinPathWithPreferredGopath(tool, tool === 'go' ? [] : [getToolsGopath(), utils_1.getCurrentGoPath()], vscode.workspace.getConfiguration('go', null).get('alternateTools'));
}
exports.getBinPath = getBinPath;
function getToolsGopath(useCache = true) {
    if (!useCache || !toolsGopath) {
        toolsGopath = resolveToolsGopath();
    }
    return toolsGopath;
}
exports.getToolsGopath = getToolsGopath;
function resolveToolsGopath() {
    let toolsGopathForWorkspace = vscode.workspace.getConfiguration('go')['toolsGopath'] || '';
    // In case of single root, use resolvePath to resolve ~ and ${workspaceRoot}
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 1) {
        return utils_1.resolvePath(toolsGopathForWorkspace);
    }
    // In case of multi-root, resolve ~ and ignore ${workspaceRoot}
    if (toolsGopathForWorkspace.startsWith('~')) {
        toolsGopathForWorkspace = path.join(os.homedir(), toolsGopathForWorkspace.substr(1));
    }
    if (toolsGopathForWorkspace && toolsGopathForWorkspace.trim() && !/\${workspaceRoot}/.test(toolsGopathForWorkspace)) {
        return toolsGopathForWorkspace;
    }
    // If any of the folders in multi root have toolsGopath set, use it.
    for (let i = 0; i < vscode.workspace.workspaceFolders.length; i++) {
        let toolsGopath = vscode.workspace.getConfiguration('go', vscode.workspace.workspaceFolders[i].uri).inspect('toolsGopath').workspaceFolderValue;
        toolsGopath = utils_1.resolvePath(toolsGopath, vscode.workspace.workspaceFolders[i].uri.fsPath);
        if (toolsGopath) {
            return toolsGopath;
        }
    }
}
/**
 * Runs go test and presents the output in the 'Go' channel.
 *
 * @param goConfig Configuration for the Go extension.
 */
function runGoTest(testconfig) {
    return new Promise((resolve, reject) => {
        // We do not want to clear it if tests are already running, as that could
        // lose valuable output.
        if (runningTestProcesses.length < 1) {
            outputChannel.clear();
        }
        if (!testconfig.background) {
            outputChannel.show(true);
        }
        let buildTags = testconfig.goConfig['buildTags'];
        let testFlags = testconfig.goConfig['testFlags'] || [];
        let args = ['test', ...testconfig.flags];
        let testType = testconfig.isBenchmark ? 'Benchmarks' : 'Tests';
        if (testconfig.isBenchmark) {
            args.push('-benchmem', '-run=^$');
        }
        else {
            args.push('-timeout', testconfig.goConfig['testTimeout']);
        }
        if (buildTags && testconfig.flags.indexOf('-tags') === -1) {
            args.push('-tags', buildTags);
        }
        testFlags.forEach((flag) => args.push(flag));
        let testEnvVars = utils_1.getTestEnvVars(testconfig.goConfig);
        let goRuntimePath = getBinPath('go');
        if (!goRuntimePath) {
            vscode.window.showInformationMessage('Cannot find "go" binary. Update PATH or GOROOT appropriately');
            return Promise.resolve();
        }
        // Append the package name to args to enable running tests in symlinked directories
        // let currentGoWorkspace = getCurrentGoWorkspaceFromGOPATH(getCurrentGoPath(), testconfig.dir);
        // if (currentGoWorkspace && !testconfig.includeSubDirectories) {
        // 	args.push(testconfig.dir.substr(currentGoWorkspace.length + 1));
        // }
        targetArgs(testconfig).then(targets => {
            let outTargets = args.slice(0);
            if (targets.length > 4) {
                outTargets.push('<long arguments omitted>');
            }
            else {
                outTargets.push(...targets);
            }
            outputChannel.appendLine(['Running tool:', goRuntimePath, ...outTargets].join(' '));
            outputChannel.appendLine('');
            args.push(...targets);
            let tp = cp.spawn(goRuntimePath, args, { env: testEnvVars, cwd: testconfig.dir });
            const outBuf = new utils_1.LineBuffer();
            const errBuf = new utils_1.LineBuffer();
            const packageResultLineRE = /^(--- FAIL:)[ \t]+(.+?)[ \t]+(\([0-9\.]+s\)|\(cached\))/; // 1=ok/FAIL, 2=package, 3=time/(cached)
            //const packageResultLineRE = /^(ok|FAIL)[ \t]+(.+?)[ \t]+([0-9\.]+s|\(cached\))/; // 1=ok/FAIL, 2=package, 3=time/(cached)
            const testResultLines = [];
            const failedTests = [];
            const processTestResultLine = (line) => {
                testResultLines.push(line);
                const result = line.match(packageResultLineRE);
                if (result) {
                    failedTests.push(result[2]);
                }
            };
            // go test emits test results on stdout, which contain file names relative to the package under test
            outBuf.onLine(line => processTestResultLine(line));
            outBuf.onDone(last => {
                if (last)
                    processTestResultLine(last);
                // If there are any remaining test result lines, emit them to the output channel.
                if (testResultLines.length > 0) {
                    testResultLines.forEach(line => outputChannel.appendLine(line));
                }
            });
            // go test emits build errors on stderr, which contain paths relative to the cwd
            errBuf.onLine(line => outputChannel.appendLine(expandFilePathInOutput(line, testconfig.dir)));
            errBuf.onDone(last => last && outputChannel.appendLine(expandFilePathInOutput(last, testconfig.dir)));
            tp.stdout.on('data', chunk => outBuf.append(chunk.toString()));
            tp.stderr.on('data', chunk => errBuf.append(chunk.toString()));
            tp.on('close', (code, signal) => {
                outBuf.done();
                errBuf.done();
                if (code) {
                    outputChannel.appendLine(`Error: ${testType} failed.`);
                }
                else if (signal === sendSignal) {
                    outputChannel.appendLine(`Error: ${testType} terminated by user.`);
                }
                else {
                    outputChannel.appendLine(`Success: ${testType} passed.`);
                }
                let index = runningTestProcesses.indexOf(tp, 0);
                if (index > -1) {
                    runningTestProcesses.splice(index, 1);
                }
                resolve(new rawTestResult_1.RawTestResult(code === 0, testResultLines, failedTests));
            });
            runningTestProcesses.push(tp);
        }, err => {
            outputChannel.appendLine(`Error: ${testType} failed.`);
            outputChannel.appendLine(err);
            resolve(new rawTestResult_1.RawTestResult(false, [], err));
        });
    });
}
exports.runGoTest = runGoTest;
function expandFilePathInOutput(output, cwd) {
    let lines = output.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let matches = lines[i].match(/^\s*(.+.go):(\d+):/);
        if (matches && matches[1] && !path.isAbsolute(matches[1])) {
            lines[i] = lines[i].replace(matches[1], path.join(cwd, matches[1]));
        }
    }
    return lines.join('\n');
}
/**
 * Get the test target arguments.
 *
 * @param testconfig Configuration for the Go extension.
 */
function targetArgs(testconfig) {
    if (testconfig.functions) {
        let params = [];
        if (testconfig.isBenchmark) {
            params = ['-bench', util.format('^%s$', testconfig.functions.join('|'))];
        }
        else {
            let testFunctions = testconfig.functions;
            if (testFunctions.length > 0) {
                params = params.concat(['-run', util.format('^%s$', testFunctions.join('|'))]);
            }
        }
        return Promise.resolve(params);
    }
    let params = [];
    if (testconfig.isBenchmark) {
        params = ['-bench', '.'];
    }
    return Promise.resolve(params);
}
//# sourceMappingURL=testUtil.js.map