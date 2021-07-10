import * as vscode from 'vscode';
import * as fs from 'fs';

export class DartImportSorter {
	private packageName: String = '';

	public async initialize() {
		console.log('initialize');
		await this.findPackageName();
	}

	private async findPackageName() {
		const pubspecs = await vscode.workspace.findFiles('pubspec.yaml');
		if (!pubspecs.length) {
			vscode.window.showInformationMessage(`!pubspecs.length`);
			return;
		}

		const pubspec = pubspecs[0];
		const content = await fs.readFileSync(pubspec.fsPath, 'utf8');
		if (!content) {
			vscode.window.showInformationMessage(`!content`);
			return;
		}

		const regex = /^name:.*\n/g;
		const match = content.match(regex);
		if (!match) {
			return;
		}
		const packageName = match.toString().replace('name:', '').trim();
		vscode.window.showInformationMessage(`packageName: ${packageName}`);
	}

	private async sortImports() {}

	public handleSortCommand() {}

	public handleOnWillSaveTextDocument(event: vscode.TextDocumentWillSaveEvent) {}
}
