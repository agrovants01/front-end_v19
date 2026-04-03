import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackupFormComponent } from './backup-form.component';

describe('BackupFormComponent', () => {
  let component: BackupFormComponent;
  let fixture: ComponentFixture<BackupFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BackupFormComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BackupFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
