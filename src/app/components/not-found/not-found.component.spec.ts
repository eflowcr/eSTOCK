import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { NotFoundComponent } from './not-found.component';
import { LanguageService } from '@app/services/extras/language.service';

describe('NotFoundComponent (B19 S3.6)', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    const langSpy = jasmine.createSpyObj('LanguageService', ['t']);
    langSpy.t.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [NotFoundComponent, RouterModule.forRoot([])],
      providers: [{ provide: LanguageService, useValue: langSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders 404 + title + subtitle', () => {
    const html: string = fixture.nativeElement.innerHTML;
    expect(html).toContain('404');
    expect(html).toContain('not_found.title');
    expect(html).toContain('not_found.subtitle');
    expect(html).toContain('not_found.back_to_dashboard');
    expect(html).toContain('not_found.report');
  });

  it('exposes the current url for diagnostics', () => {
    expect(component.currentUrl).toBeDefined();
  });
});
