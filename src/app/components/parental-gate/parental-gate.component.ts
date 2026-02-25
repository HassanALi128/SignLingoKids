import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircle, close, shieldCheckmark, backspace } from 'ionicons/icons';

// ─── Difficulty tiers ────────────────────────────────────────────────────────
// Apple's App Review team WILL tap "Unlock Premium" themselves.
// The math must be hard enough that a child can't guess it quickly,
// but easy enough that an adult can compute it mentally in ~5 seconds.
// Multiplication up to 12×12 satisfies both constraints.
interface MathTier {
  label: string;
  generate: () => {
    num1: number;
    num2: number;
    operator: string;
    answer: number;
  };
}

const TIERS: MathTier[] = [
  {
    label: 'multiply',
    generate: () => {
      const num1 = Math.floor(Math.random() * 8) + 4; // 4–11
      const num2 = Math.floor(Math.random() * 8) + 4; // 4–11
      return { num1, num2, operator: '×', answer: num1 * num2 };
    },
  },
  {
    label: 'divide',
    generate: () => {
      const divisor = Math.floor(Math.random() * 8) + 3; // 3–10
      const quotient = Math.floor(Math.random() * 8) + 3; // 3–10
      const dividend = divisor * quotient;
      return { num1: dividend, num2: divisor, operator: '÷', answer: quotient };
    },
  },
];

@Component({
  selector: 'app-parental-gate',
  templateUrl: './parental-gate.component.html',
  styleUrls: ['./parental-gate.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
  ],
})
export class ParentalGateComponent implements OnInit {
  // ─── Question state ─────────────────────────────────────────────────────
  num1 = 0;
  num2 = 0;
  operator = '×';
  correctAnswer = 0;

  // ─── Input state ─────────────────────────────────────────────────────────
  /** The digits the parent has typed via the custom numpad. Max 3 digits. */
  displayValue = '';

  showError = false;
  errorMessage = '';
  /** Briefly true after a correct answer to show a success flash */
  showSuccess = false;

  /** Numpad rows — standard phone layout */
  readonly numpadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['⌫', '0', '✓'],
  ];

  constructor(private modalController: ModalController) {
    addIcons({ close, shieldCheckmark, alertCircle, backspace });
  }

  ngOnInit() {
    this.generateQuestion();
  }

  // ─── Question generation ─────────────────────────────────────────────────
  generateQuestion() {
    const tier = TIERS[Math.floor(Math.random() * TIERS.length)];
    const q = tier.generate();
    this.num1 = q.num1;
    this.num2 = q.num2;
    this.operator = q.operator;
    this.correctAnswer = q.answer;

    this.displayValue = '';
    this.showError = false;
    this.showSuccess = false;
  }

  // ─── Numpad press handler ─────────────────────────────────────────────────
  onKey(key: string) {
    if (key === '⌫') {
      this.displayValue = this.displayValue.slice(0, -1);
      this.showError = false;
      return;
    }

    if (key === '✓') {
      this.submit();
      return;
    }

    // Limit to 3 digits (max answer for 12×12 = 144, still 3 digits)
    if (this.displayValue.length < 3) {
      this.displayValue += key;
      this.showError = false;
    }
  }

  // ─── Submission ───────────────────────────────────────────────────────────
  submit() {
    const answer = parseInt(this.displayValue, 10);

    if (isNaN(answer) || this.displayValue.length === 0) {
      this.showError = true;
      this.errorMessage = 'Please enter a number';
      return;
    }

    if (answer === this.correctAnswer) {
      // ✅ Correct — flash success then resolve modal
      this.showSuccess = true;
      setTimeout(() => {
        this.modalController.dismiss({ verified: true });
      }, 500);
    } else {
      // ❌ Wrong — show error and replace with a fresh question
      this.showError = true;
      this.errorMessage = 'Incorrect. Try again!';
      setTimeout(() => {
        this.generateQuestion();
      }, 1200);
    }
  }

  cancel() {
    this.modalController.dismiss({ verified: false });
  }
}
