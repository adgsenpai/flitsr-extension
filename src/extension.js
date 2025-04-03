"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
//
// A simple TreeItem representing one installation check
//
class InstallationItem extends vscode.TreeItem {
    label;
    isInstalled;
    command;
    constructor(label, isInstalled, command) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.isInstalled = isInstalled;
        this.command = command;
        // Use a check icon if installed, otherwise a warning icon.
        this.iconPath = new vscode.ThemeIcon(isInstalled ? 'check' : 'warning');
        this.description = isInstalled ? 'Installed' : 'Not Installed';
    }
}
//
// The TreeDataProvider for our sidebar view
//
class InstallationProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    pythonInstalled = false;
    flitsrInstalled = false;
    constructor() {
        this.refresh();
    }
    // Refresh by checking if Python and FLITSR commands work.
    refresh() {
        Promise.all([checkPython(), checkFlitsr()]).then(results => {
            [this.pythonInstalled, this.flitsrInstalled] = results;
            this._onDidChangeTreeData.fire();
        });
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        const items = [];
        items.push(new InstallationItem('Python 3.10', this.pythonInstalled));
        items.push(new InstallationItem('FLITSR command', this.flitsrInstalled));
        // If either command is missing, add an "Install FLITSR" action.
        if (!this.pythonInstalled || !this.flitsrInstalled) {
            items.push(new InstallationItem('Install FLITSR', false, {
                command: 'flitsr.install',
                title: 'Install FLITSR'
            }));
        }
        return Promise.resolve(items);
    }
}
//
// Check if 'python3.10 --version' executes successfully.
//
function checkPython() {
    return new Promise((resolve) => {
        (0, child_process_1.exec)('python3.10 --version', (error, stdout, stderr) => {
            resolve(!error);
        });
    });
}
//
// Check if 'flitsr --help' executes successfully.
//
function checkFlitsr() {
    return new Promise((resolve) => {
        (0, child_process_1.exec)('flitsr --help', (error, stdout, stderr) => {
            resolve(!error);
        });
    });
}
//
// Installation routine: clone the repo, change permissions, and run setup.sh.
// This runs in an integrated terminal so that interactive prompts (e.g. for admin password)
// will be shown to the user.
//
function installFlitsr() {
    const terminal = vscode.window.createTerminal('FLITSR Installer');
    // Sequence of installation commands.
    terminal.sendText('git clone http://github.com/adgsenpai/flitsr');
    terminal.sendText('cd flitsr');
    terminal.sendText('chmod +x ./setup.sh');
    terminal.sendText('./setup.sh');
    terminal.show();
    // Update the status bar to indicate installation is in progress.
    statusBarItem.text = 'FLITSR: Installing...';
}
//
// Command to prompt for admin password if required.
// (In an interactive terminal the user might get prompted automatically,
// but you can also capture the password via an input box.)
//
async function promptAdminPassword() {
    const password = await vscode.window.showInputBox({
        prompt: 'Enter your admin password',
        password: true
    });
    if (password) {
        vscode.window.showInformationMessage('Admin password received. Please check the terminal for further prompts.');
        // Optionally, you could incorporate the password into a sudo command here.
    }
}
//
// Status bar item to show installation status
//
let statusBarItem;
function activate(context) {
    // Create and register our installation tree view.
    const installationProvider = new InstallationProvider();
    vscode.window.registerTreeDataProvider('flitsrInstallation', installationProvider);
    // Command to run installation.
    const installCmd = vscode.commands.registerCommand('flitsr.install', () => {
        installFlitsr();
    });
    // Command to prompt for admin password.
    const promptAdminCmd = vscode.commands.registerCommand('flitsr.promptAdmin', () => {
        promptAdminPassword();
    });
    context.subscriptions.push(installCmd, promptAdminCmd);
    // Create a status bar item at the bottom right.
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = 'FLITSR: Checking installation...';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Update the status based on checks.
    Promise.all([checkPython(), checkFlitsr()]).then(results => {
        const [pythonInstalled, flitsrInstalled] = results;
        if (pythonInstalled && flitsrInstalled) {
            statusBarItem.text = 'FLITSR: Installed';
        }
        else {
            statusBarItem.text = 'FLITSR: Not installed';
        }
    });
    // Optionally, refresh the tree view every 5 seconds.
    const refreshInterval = setInterval(() => {
        installationProvider.refresh();
    }, 5000);
    context.subscriptions.push({ dispose: () => clearInterval(refreshInterval) });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map