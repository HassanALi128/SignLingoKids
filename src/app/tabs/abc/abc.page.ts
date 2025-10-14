import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircle, book, checkmark, checkmarkCircle, close, closeCircle, home } from 'ionicons/icons';
import { Router } from '@angular/router';

interface Letter {
  id: string;
  letter: string;
  handSignUrl: string;
}

@Component({
  selector: 'app-abc',
  templateUrl: './abc.page.html',
  styleUrls: ['./abc.page.scss'],
  imports: [IonicModule, CommonModule]
})
export class AbcPage implements OnInit {
  // ABC Data
  letters: Letter[] = [
    {
      id: 'A',
      letter: 'A',
      handSignUrl: 'assets/images/spelling/a.svg'
    },
    {
      id: 'B',
      letter: 'B',
      handSignUrl: 'assets/images/spelling/b.svg'
    },
    {
      id: 'C',
      letter: 'C',
      handSignUrl: 'assets/images/spelling/c.svg'
    },
    {
      id: 'D',
      letter: 'D',
      handSignUrl: 'assets/images/spelling/d.svg'
    },
    {
      id: 'E',
      letter: 'E',
      handSignUrl: 'assets/images/spelling/e.svg'
    },
    {
      id: 'F',
      letter: 'F',
      handSignUrl: 'assets/images/spelling/f.svg'
    },
    {
      id: 'G',
      letter: 'G',
      handSignUrl: 'assets/images/spelling/g.svg'
    },
    {
      id: 'H',
      letter: 'H',
      handSignUrl: 'assets/images/spelling/h.svg'
    },
    {
      id: 'I',
      letter: 'I',
      handSignUrl: 'assets/images/spelling/i.svg'
    },
    {
      id: 'J',
      letter: 'J',
      handSignUrl: 'assets/images/spelling/j.svg'
    },
    {
      id: 'K',
      letter: 'K',
      handSignUrl: 'assets/images/spelling/k.svg'
    },
    {
      id: 'L',
      letter: 'L',
      handSignUrl: 'assets/images/spelling/l.svg'
    },
    {
      id: 'M',
      letter: 'M',
      handSignUrl: 'assets/images/spelling/m.svg'
    },
    {
      id: 'N',
      letter: 'N',
      handSignUrl: 'assets/images/spelling/n.svg'
    },
    {
      id: 'O',
      letter: 'O',
      handSignUrl: 'assets/images/spelling/o.svg'
    },
    {
      id: 'P',
      letter: 'P',
      handSignUrl: 'assets/images/spelling/p.svg'
    },
    {
      id: 'Q',
      letter: 'Q',
      handSignUrl: 'assets/images/spelling/q.svg'
    },
    {
      id: 'R',
      letter: 'R',
      handSignUrl: 'assets/images/spelling/r.svg'
    },
    {
      id: 'S',
      letter: 'S',
      handSignUrl: 'assets/images/spelling/s.svg'
    },
    {
      id: 'T',
      letter: 'T',
      handSignUrl: 'assets/images/spelling/t.svg'
    },
    {
      id: 'U',
      letter: 'U',
      handSignUrl: 'assets/images/spelling/u.svg'
    },
    {
      id: 'V',
      letter: 'V',
      handSignUrl: 'assets/images/spelling/v.svg'
    },
    {
      id: 'W',
      letter: 'W',
      handSignUrl: 'assets/images/spelling/w.svg'
    },
    {
      id: 'X',
      letter: 'X',
      handSignUrl: 'assets/images/spelling/x.svg'
    },
    {
      id: 'Y',
      letter: 'Y',
      handSignUrl: 'assets/images/spelling/y.svg'
    },
    {
      id: 'Z',
      letter: 'Z',
      handSignUrl: 'assets/images/spelling/z.svg'
    }
  ];

  // State
  selectedLetter: Letter | null = null;
  learnedLetters: string[] = [];
  learnedCount = 0;
  totalLetters = 26;

  constructor(private router: Router) {
    addIcons({closeCircle,checkmarkCircle,book,checkmark,home})
  }

  goToLanding(): void {
    this.router.navigate(['/']);
  }

  ngOnInit() {
    // Load learned letters from localStorage
    this.loadLearnedLetters();
    this.updateLearnedCount();
  }

  // 🔥 Select Letter
  selectLetter(letter: Letter): void {
    this.selectedLetter = letter;
    console.log('Selected letter:', letter.letter);
  }

  // 🔥 Close Letter Modal
  closeLetterModal(): void {
    this.selectedLetter = null;
  }

  // 🔥 Toggle Learned Status
  toggleLearnedStatus(letter: Letter): void {
    if (this.isLetterLearned(letter.id)) {
      // Remove from learned letters
      this.learnedLetters = this.learnedLetters.filter(id => id !== letter.id);
    } else {
      // Add to learned letters
      this.learnedLetters.push(letter.id);
    }

    this.updateLearnedCount();
    this.saveLearnedLetters();

    console.log('Toggled learned status for:', letter.letter);
    console.log('Learned letters:', this.learnedLetters);
  }

  // 🔥 Check if Letter is Learned
  isLetterLearned(letterId: string): boolean {
    return this.learnedLetters.includes(letterId);
  }

  // 🔥 Update Learned Count
  updateLearnedCount(): void {
    this.learnedCount = this.learnedLetters.length;
  }

  // 🔥 Get Progress
  getProgress(): number {
    return this.learnedCount / this.totalLetters;
  }

  // 🔥 Save Learned Letters to localStorage
  saveLearnedLetters(): void {
    localStorage.setItem('learnedLetters', JSON.stringify(this.learnedLetters));
  }

  // 🔥 Load Learned Letters from localStorage
  loadLearnedLetters(): void {
    const saved = localStorage.getItem('learnedLetters');
    if (saved) {
      this.learnedLetters = JSON.parse(saved);
    }
  }
}
