import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuizQuestionsPage } from './quiz-questions.page';

describe('QuizQuestionsPage', () => {
  let component: QuizQuestionsPage;
  let fixture: ComponentFixture<QuizQuestionsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(QuizQuestionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
