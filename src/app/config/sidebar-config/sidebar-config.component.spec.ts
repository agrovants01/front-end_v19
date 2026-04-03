import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarConfigComponent } from './sidebar-config.component';

describe('SidebarConfigComponent', () => {
  let component: SidebarConfigComponent;
  let fixture: ComponentFixture<SidebarConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SidebarConfigComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
