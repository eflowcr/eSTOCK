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
});
