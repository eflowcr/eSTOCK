import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReceivingTaskManagementComponent } from './receiving-task-management.component';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { ZardDialogService } from '@app/shared/components/dialog';
import { mockResponse } from '../../../../__tests__/mocks/data';

describe('ReceivingTaskManagementComponent (B13 S3.6)', () => {
  let component: ReceivingTaskManagementComponent;
  let fixture: ComponentFixture<ReceivingTaskManagementComponent>;
  let serviceSpy: jasmine.SpyObj<ReceivingTaskService>;

  const langSpy = jasmine.createSpyObj('LanguageService', ['t']);
  const alertSpy = jasmine.createSpyObj('AlertService', ['success', 'error', 'info']);
  const dialogSpy = jasmine.createSpyObj('ZardDialogService', ['create']);

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('ReceivingTaskService', ['getAll']);
    langSpy.t.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [ReceivingTaskManagementComponent, HttpClientTestingModule, RouterModule.forRoot([])],
      providers: [
        { provide: ReceivingTaskService, useValue: serviceSpy },
        { provide: AlertService, useValue: alertSpy },
        { provide: LanguageService, useValue: langSpy },
        { provide: ZardDialogService, useValue: dialogSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceivingTaskManagementComponent);
    component = fixture.componentInstance;
  });

  it('B13 S3.6: loads tasks from service after ngOnInit and exposes correct counts', fakeAsync(async () => {
    serviceSpy.getAll.and.returnValue(
      Promise.resolve(
        mockResponse([
          { task_id: 't-1', status: 'open', priority: 'normal' },
          { task_id: 't-2', status: 'in_progress', priority: 'urgent' },
          { task_id: 't-3', status: 'completed', priority: 'normal' },
        ] as any),
      ),
    );

    fixture.detectChanges(); // triggers ngOnInit → loadReceivingTasks
    await Promise.resolve();
    tick();

    expect(serviceSpy.getAll).toHaveBeenCalledTimes(1);
    expect(component.receivingTasks.length).toBe(3);
    expect(component.openTasksCount).toBe(1);
    expect(component.inProgressCount).toBe(1);
    expect(component.activeTasks.length).toBe(2);
  }));

  // ──────────────────────────────────────────────────────────────────────
  // S3.7 W3 (B14) — Drafts tab surfaces tasks with status === 'draft'
  // Previously these were invisible (only active/processed buckets existed).
  // ──────────────────────────────────────────────────────────────────────
  describe('B14 S3.7 W3: drafts tab', () => {
    it('exposes draftTasks separated from active and processed', fakeAsync(async () => {
      serviceSpy.getAll.and.returnValue(
        Promise.resolve(
          mockResponse([
            { task_id: 't-1', status: 'open', priority: 'normal' },
            { task_id: 't-2', status: 'in_progress', priority: 'normal' },
            { task_id: 't-3', status: 'completed', priority: 'normal' },
            { task_id: 't-4', status: 'draft', priority: 'normal' },
            { task_id: 't-5', status: 'draft', priority: 'normal' },
          ] as any),
        ),
      );

      fixture.detectChanges();
      await Promise.resolve();
      tick();

      expect(component.draftTasks.length).toBe(2);
      expect(component.activeTasks.length).toBe(2); // open + in_progress (not draft)
      expect(component.processedTasks.length).toBe(1); // completed only
    }));

    it('switches currentTabTasks to drafts when activeTab is "drafts"', fakeAsync(async () => {
      serviceSpy.getAll.and.returnValue(
        Promise.resolve(
          mockResponse([
            { task_id: 't-1', status: 'open', priority: 'normal' },
            { task_id: 't-4', status: 'draft', priority: 'normal' },
          ] as any),
        ),
      );

      fixture.detectChanges();
      await Promise.resolve();
      tick();

      component.setActiveTab('drafts');
      expect(component.activeTab).toBe('drafts');
      expect(component.currentTabTasks.length).toBe(1);
      expect(component.currentTabTasks[0].task_id).toBe('t-4');
      expect(component.currentTabBaseTotal).toBe(1);
      expect(component.currentTabDescription).toBe('tasks_in_draft');
    }));

    it('renders the drafts tab button in the template', fakeAsync(async () => {
      serviceSpy.getAll.and.returnValue(Promise.resolve(mockResponse([] as any)));
      fixture.detectChanges();
      await Promise.resolve();
      tick();
      fixture.detectChanges();

      const draftsTab = fixture.nativeElement.querySelector(
        '[data-testid="tab-drafts"]',
      ) as HTMLButtonElement | null;
      expect(draftsTab).not.toBeNull();
    }));
  });
});
