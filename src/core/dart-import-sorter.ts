import { readFileSync } from 'fs';
import * as vscode from 'vscode';

export class DartImportSorter {
	private packageName: String = '';

	public async initialize() {
		await this.findPackageName();
	}

	public handleSortCommand() {}

	public handleOnWillSaveTextDocument(event: vscode.TextDocumentWillSaveEvent) {}

	private async findPackageName() {
		const pubspecs = await vscode.workspace.findFiles('pubspec.yaml');
		if (!pubspecs.length) {
			vscode.window.showInformationMessage(`!pubspecs.length`);
			return;
		}

		const pubspec = pubspecs[0];
		const content = await readFileSync(pubspec.fsPath, 'utf8');
		if (!content) {
			vscode.window.showInformationMessage(`!content`);
			return;
		}

		const regex = /^name:.*\n/g;
		const match = content.match(regex);
		if (!match) {
			return;
		}
		this.packageName = match.toString().replace('name:', '').trim();
	}

	private async sortImports() {}
}
