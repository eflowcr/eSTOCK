import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { ZardDialogService } from '@app/shared/components/dialog';
import { DataExportConfig } from '@app/components/shared/data-export/data-export.component';
import { FileImportConfig } from '@app/components/shared/file-import/file-import.component';
import { DataExportContentComponent } from '@app/components/shared/data-export/data-export-content.component';
import { FileImportContentComponent } from '@app/components/shared/file-import/file-import-content.component';
import { ReceivingTask } from '@app/models/receiving-task.model';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { handleApiError } from '@app/utils';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { ReceivingTaskFormComponent } from '../receiving-task-form/receiving-task-form.component';
import { ReceivingTaskListComponent } from '../receiving-task-list/receiving-task-list.component';

@Component({
	selector: 'app-receiving-task-management',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		RouterModule,
		ReceivingTaskListComponent,
		ReceivingTaskFormComponent,
		MainLayoutComponent
	],
	templateUrl: './receiving-task-management.component.html',
	styleUrls: ['./receiving-task-management.component.css']
})
export class ReceivingTaskManagementComponent implements OnInit {
	receivingTasks: ReceivingTask[] = [];
	isLoading = false;
	isCreateDialogOpen = false;
	isEditDialogOpen = false;
	editingTask: ReceivingTask | null = null;
	activeTab: 'active' | 'processed' = 'active';

	// Export configuration
	exportConfig: DataExportConfig = {
		title: 'Export Receiving Tasks',
		endpoint: '/api/export/receiving-tasks',
		data: [],
		filename: 'receiving_tasks_export'
	};

	// Import configuration
	importConfig: FileImportConfig = {
		title: 'import_receiving_tasks',
		endpoint: '/api/import/receiving-tasks',
		acceptedFormats: ['.csv', '.xlsx', '.xls'],
		templateFields: ['inboundNumber', 'assignedTo', 'priority', 'notes', 'items'],
		maxFileSize: 10,
		templateType: 'receiving_tasks'
	};

	constructor(
		private receivingTaskService: ReceivingTaskService,
		private alertService: AlertService,
		private languageService: LanguageService,
		private dialogService: ZardDialogService
	) {}

	ngOnInit(): void {
		this.loadReceivingTasks();
	}

	get t() {
		return this.languageService.t.bind(this.languageService);
	}

	setActiveTab(tab: 'active' | 'processed'): void {
		this.activeTab = tab;
	}

	getTabClass(tab: 'active' | 'processed'): string {
		const isActive = this.activeTab === tab;
		const baseClasses = 'py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 cursor-pointer';
		
		if (isActive) {
			return `${baseClasses} border-[#3e66ea] text-[#3e66ea] bg-white dark:bg-gray-800`;
		} else {
			return `${baseClasses} border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300`;
		}
	}

	getTabBadgeClass(tab: 'active' | 'processed'): string {
		const isActive = this.activeTab === tab;
		const baseClasses = 'ml-2 text-xs px-2.5 py-1 rounded-full font-medium';
		
		if (isActive) {
			return `${baseClasses} bg-[#3e66ea] text-white`;
		} else {
			return `${baseClasses} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300`;
		}
	}

	async loadReceivingTasks(): Promise<void> {
		this.isLoading = true;
		try {
			const response = await this.receivingTaskService.getAll();
			if (response.result.success) {
				this.receivingTasks = response.data || [];
				this.exportConfig.data = this.receivingTasks;
			} else {
				this.alertService.error(
					response.result.message || this.t('operation_failed'),
					this.t('error')
				);
			}
		} catch (error: any) {
			this.alertService.error(
				handleApiError(error, this.t('failed_to_load_receiving_tasks')),
				this.t('error')
			);
		} finally {
			this.isLoading = false;
		}
	}

	get activeTasks(): ReceivingTask[] {
		return this.receivingTasks.filter(task => 
			task.status === 'open' || task.status === 'in_progress'
		);
	}

	get processedTasks(): ReceivingTask[] {
		return this.receivingTasks.filter(task => 
			task.status === 'completed' || task.status === 'cancelled'
		);
	}

	// Nuevo: método para obtener las tareas del tab actual
	get currentTabTasks(): ReceivingTask[] {
		return this.activeTab === 'active' ? this.activeTasks : this.processedTasks;
	}

	// Nuevo: método para obtener la descripción del tab actual
	get currentTabDescription(): string {
		return this.activeTab === 'active' 
			? this.t('tasks_open_or_in_progress') 
			: this.t('tasks_completed_or_cancelled');
	}

	handleEdit(task: ReceivingTask): void {
		this.editingTask = task;
		this.isEditDialogOpen = true;
	}

	onTaskCreated(): void {
		this.isCreateDialogOpen = false;
		this.loadReceivingTasks();
		this.alertService.success(
			this.t('receiving_task_created_successfully'),
			this.t('success')
		);
	}

	onTaskUpdated(): void {
		this.isEditDialogOpen = false;
		this.editingTask = null;
		this.loadReceivingTasks();
		this.alertService.success(
			this.t('receiving_task_updated_successfully'),
			this.t('success')
		);
	}

	openImportDialog(): void {
		this.dialogService.create({
			zTitle: this.t('import_data'),
			zContent: FileImportContentComponent,
			zData: {
				config: this.importConfig,
				onSuccess: () => this.onImportSuccess(),
				onError: () => {},
			},
			zHideFooter: true,
			zCustomClasses: 'sm:max-w-2xl',
		});
	}

	onImportSuccess(): void {
		this.loadReceivingTasks();
		this.alertService.success(this.t('import_completed_successfully'), this.t('success'));
	}

	onExportSuccess(): void {
		this.alertService.success(this.t('export_completed_successfully'), this.t('success'));
	}

	openExportDialog(): void {
		this.exportConfig.data = this.receivingTasks;
		this.dialogService.create({
			zTitle: this.t('export_data'),
			zDescription: this.t('export_description'),
			zContent: DataExportContentComponent,
			zData: {
				config: this.exportConfig,
				onExported: () => this.onExportSuccess(),
			},
			zHideFooter: true,
			zCustomClasses: 'sm:max-w-md',
		});
	}

    onRefresh(): void {
        this.loadReceivingTasks();
      }
}
