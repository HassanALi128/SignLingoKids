import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbcPage } from './abc.page';

describe('AbcPage', () => {
  let component: AbcPage;
  let fixture: ComponentFixture<AbcPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AbcPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
