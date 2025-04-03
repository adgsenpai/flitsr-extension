import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

//
// A simple TreeItem representing one installation check
//
class InstallationItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly isInstalled: boolean,
		public readonly command?: vscode.Command
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		// Use a check icon if installed, otherwise a warning icon.
		this.iconPath = new vscode.ThemeIcon(isInstalled ? 'check' : 'warning');
		this.description = isInstalled ? 'Installed' : 'Not Installed';
	}
}

//
// The TreeDataProvider for our sidebar view
//
class InstallationProvider implements vscode.TreeDataProvider<InstallationItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<InstallationItem | undefined | null | void> = new vscode.EventEmitter<InstallationItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<InstallationItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private pythonInstalled: boolean = false;
	private flitsrInstalled: boolean = false;

	constructor() {
		this.refresh();
	}

	// Refresh by checking if Python and FLITSR commands work.
	refresh(): void {
		Promise.all([checkPython(), checkFlitsr()]).then(results => {
			[this.pythonInstalled, this.flitsrInstalled] = results;
			this._onDidChangeTreeData.fire();
		});
	}

	getTreeItem(element: InstallationItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: InstallationItem): Thenable<InstallationItem[]> {
		const items: InstallationItem[] = [];
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
function checkPython(): Promise<boolean> {
	return new Promise((resolve) => {
		exec('python3.10 --version', (error, stdout, stderr) => {
			resolve(!error);
		});
	});
}

//
// Check if 'flitsr --help' executes successfully.
//
function checkFlitsr(): Promise<boolean> {
	return new Promise((resolve) => {
		exec('flitsr --help', (error, stdout, stderr) => {
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
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
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
		} else {
			statusBarItem.text = 'FLITSR: Not installed';
		}
	});

	// Optionally, refresh the tree view every 5 seconds.
	const refreshInterval = setInterval(() => {
		installationProvider.refresh();
	}, 5000);
	context.subscriptions.push({ dispose: () => clearInterval(refreshInterval) });
}

export function deactivate() {}
