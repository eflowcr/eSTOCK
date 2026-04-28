import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PickingTaskManagementComponent } from './picking-task-management.component';
import { PickingTaskService } from '@app/services/picking-task.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { ZardDialogService } from '@app/shared/components/dialog';
import { mockResponse } from '../../../../__tests__/mocks/data';

describe('PickingTaskManagementComponent (S3.7 W3 B14)', () => {
  let component: PickingTaskManagementComponent;
  let fixture: ComponentFixture<PickingTaskManagementComponent>;
  let serviceSpy: jasmine.SpyObj<PickingTaskService>;

  const langSpy = jasmine.createSpyObj('LanguageService', ['t']);
  const alertSpy = jasmine.createSpyObj('AlertService', ['success', 'error', 'info']);
  const loadingSpy = jasmine.createSpyObj('LoadingService', ['show', 'hide']);
  const dialogSpy = jasmine.createSpyObj('ZardDialogService', ['create']);

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('PickingTaskService', ['getAll']);
    langSpy.t.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [PickingTaskManagementComponent, HttpClientTestingModule, RouterModule.forRoot([])],
      providers: [
        { provide: PickingTaskService, useValue: serviceSpy },
        { provide: AlertService, useValue: alertSpy },
        { provide: LanguageService, useValue: langSpy },
        { provide: LoadingService, useValue: loadingSpy },
        { provide: ZardDialogService, useValue: dialogSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PickingTaskManagementComponent);
    component = fixture.componentInstance;
  });

  describe('B14 S3.7 W3: drafts tab', () => {
    it('exposes draftTasks separated from active and processed', fakeAsync(async () => {
      serviceSpy.getAll.and.returnValue(
        Promise.resolve(
          mockResponse([
            { task_id: 'p-1', status: 'open', priority: 'normal' },
            { task_id: 'p-2', status: 'in_progress', priority: 'normal' },
            { task_id: 'p-3', status: 'completed', priority: 'normal' },
            { task_id: 'p-4', status: 'draft', priority: 'normal' },
            { task_id: 'p-5', status: 'draft', priority: 'normal' },
            { task_id: 'p-6', status: 'draft', priority: 'normal' },
          ] as any),
        ),
      );

      fixture.detectChanges();
      await Promise.resolve();
      tick();

      expect(component.draftTasks.length).toBe(3);
      expect(component.activeTasks.length).toBe(2);
      expect(component.processedTasks.length).toBe(1);
    }));

    it('switches currentTabTasks to drafts when activeTab is "drafts"', fakeAsync(async () => {
      serviceSpy.getAll.and.returnValue(
        Promise.resolve(
          mockResponse([
            { task_id: 'p-1', status: 'open', priority: 'normal' },
            { task_id: 'p-4', status: 'draft', priority: 'normal' },
          ] as any),
        ),
      );

      fixture.detectChanges();
      await Promise.resolve();
      tick();

      component.setActiveTab('drafts');
      expect(component.activeTab).toBe('drafts');
      expect(component.currentTabTasks.length).toBe(1);
      expect(component.currentTabTasks[0].task_id).toBe('p-4');
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
