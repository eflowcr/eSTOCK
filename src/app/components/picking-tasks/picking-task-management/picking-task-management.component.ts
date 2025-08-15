import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PickingTask } from '@app/models/picking-task.model';
import { PickingTaskService } from '@app/services/picking-task.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { DataExportComponent, DataExportConfig } from '@app/components/shared/data-export/data-export.component';
import { FileImportComponent, FileImportConfig } from '@app/components/shared/file-import/file-import.component';
import { PickingTaskFormComponent } from '../picking-task-form/picking-task-form.component';
import { PickingTaskListComponent } from '../picking-task-list/picking-task-list.component';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';

@Component({
	selector: 'app-picking-task-management',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		RouterModule,
		DataExportComponent,
		FileImportComponent,
		PickingTaskListComponent,
		PickingTaskFormComponent,
		MainLayoutComponent
	],
	templateUrl: './picking-task-management.component.html',
	styleUrls: ['./picking-task-management.component.css']
})
export class PickingTaskManagementComponent implements OnInit {
	pickingTasks: PickingTask[] = [];
	isLoading = false;
	isCreateDialogOpen = false;
	isImportDialogOpen = false;
	isExportDialogOpen = false;
	isEditDialogOpen = false;
	editingTask: PickingTask | null = null;
	activeTab: 'active' | 'processed' = 'active';

	// Export configuration
	exportConfig: DataExportConfig = {
		title: 'Export Picking Tasks',
		endpoint: '/api/export/picking-tasks',
		data: [],
		filename: 'picking_tasks_export'
	};

	// Import configuration
	importConfig: FileImportConfig = {
		title: 'import_picking_tasks',
		endpoint: '/api/import/picking-tasks',
		acceptedFormats: ['.csv', '.xlsx', '.xls'],
		templateFields: ['outboundNumber', 'assignedTo', 'priority', 'notes', 'items'],
		maxFileSize: 10,
		templateType: 'picking_tasks'
	};

	constructor(
		private pickingTaskService: PickingTaskService,
		private loadingService: LoadingService,
		private alertService: AlertService,
		private languageService: LanguageService
	) {}

	ngOnInit(): void {
		this.loadPickingTasks();
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

	async loadPickingTasks(): Promise<void> {
		this.isLoading = true;
		try {
			const response = await this.pickingTaskService.getAll();
			if (response.result.success) {
				this.pickingTasks = response.data;
				// Update export config with current data
				this.exportConfig.data = this.pickingTasks;
			} else {
				this.alertService.error(
					response.result.message || this.t('operation_failed'),
					this.t('error')
				);
			}
		} catch (error) {
			this.alertService.error(
				this.t('failed_to_load_picking_tasks'),
				this.t('error')
			);
		} finally {
			this.isLoading = false;
		}
	}

	get activeTasks(): PickingTask[] {
		return this.pickingTasks.filter(task => 
			task.status === 'open' || task.status === 'in_progress'
		);
	}

	get processedTasks(): PickingTask[] {
		return this.pickingTasks.filter(task => 
			task.status === 'completed' || task.status === 'cancelled'
		);
	}

	get currentTabTasks(): PickingTask[] {
		return this.activeTab === 'active' ? this.activeTasks : this.processedTasks;
	}

	get currentTabDescription(): string {
		return this.activeTab === 'active' 
			? this.t('tasks_open_or_in_progress') 
			: this.t('tasks_completed_or_cancelled');
	}

	handleEdit(task: PickingTask): void {
		this.editingTask = task;
		this.isEditDialogOpen = true;
	}

	onTaskCreated(): void {
		this.isCreateDialogOpen = false;
		this.loadPickingTasks();
		this.alertService.success(
			this.t('picking_task_created_successfully'),
			this.t('success')
		);
	}

	onTaskUpdated(): void {
		this.isEditDialogOpen = false;
		this.editingTask = null;
		this.loadPickingTasks();
		this.alertService.success(
			this.t('picking_task_updated_successfully'),
			this.t('success')
		);
	}

	openImportDialog(): void {
		this.isImportDialogOpen = true;
	}

	onImportSuccess(): void {
		this.isImportDialogOpen = false;
		this.loadPickingTasks();
		this.alertService.success(
			this.t('import_completed_successfully'),
			this.t('success')
		);
	}

	onExportSuccess(): void {
		this.alertService.success(
			this.t('export_completed_successfully'),
			this.t('success')
		);
	}

	openExportDialog(): void {
		this.isExportDialogOpen = true;
	}

	closeExportDialog(): void {
		this.isExportDialogOpen = false;
	}

    onRefresh(): void {
        this.loadPickingTasks();
    }
}
