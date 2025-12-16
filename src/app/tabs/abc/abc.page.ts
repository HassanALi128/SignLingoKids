import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { school } from 'ionicons/icons';
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
  imports: [IonicModule, CommonModule],
})
export class AbcPage implements OnInit {
  userName: string = 'Babu';
  userAvatar: string = '';

  // ABC Data
  letters: Letter[] = [
    {
      id: 'A',
      letter: 'assets/images/abc-learn/a.webp',
      handSignUrl: 'assets/images/spelling/a.svg',
    },
    {
      id: 'B',
      letter: 'assets/images/abc-learn/b.webp',
      handSignUrl: 'assets/images/spelling/b.svg',
    },
    {
      id: 'C',
      letter: 'assets/images/abc-learn/c.webp',
      handSignUrl: 'assets/images/spelling/c.svg',
    },
    {
      id: 'D',
      letter: 'assets/images/abc-learn/d.webp',
      handSignUrl: 'assets/images/spelling/d.svg',
    },
    {
      id: 'E',
      letter: 'assets/images/abc-learn/e.webp',
      handSignUrl: 'assets/images/spelling/e.svg',
    },
    {
      id: 'F',
      letter: 'assets/images/abc-learn/f.webp',
      handSignUrl: 'assets/images/spelling/f.svg',
    },
    {
      id: 'G',
      letter: 'assets/images/abc-learn/g.webp',
      handSignUrl: 'assets/images/spelling/g.svg',
    },
    {
      id: 'H',
      letter: 'assets/images/abc-learn/h.webp',
      handSignUrl: 'assets/images/spelling/h.svg',
    },
    {
      id: 'I',
      letter: 'assets/images/abc-learn/i.webp',
      handSignUrl: 'assets/images/spelling/i.svg',
    },
    {
      id: 'J',
      letter: 'assets/images/abc-learn/j.webp',
      handSignUrl: 'assets/images/spelling/j.svg',
    },
    {
      id: 'K',
      letter: 'assets/images/abc-learn/k.webp',
      handSignUrl: 'assets/images/spelling/k.svg',
    },
    {
      id: 'L',
      letter: 'assets/images/abc-learn/l.webp',
      handSignUrl: 'assets/images/spelling/l.svg',
    },
    {
      id: 'M',
      letter: 'assets/images/abc-learn/m.webp',
      handSignUrl: 'assets/images/spelling/m.svg',
    },
    {
      id: 'N',
      letter: 'assets/images/abc-learn/n.webp',
      handSignUrl: 'assets/images/spelling/n.svg',
    },
    {
      id: 'O',
      letter: 'assets/images/abc-learn/o.webp',
      handSignUrl: 'assets/images/spelling/o.svg',
    },
    {
      id: 'P',
      letter: 'assets/images/abc-learn/p.webp',
      handSignUrl: 'assets/images/spelling/p.svg',
    },
    {
      id: 'Q',
      letter: 'assets/images/abc-learn/q.webp',
      handSignUrl: 'assets/images/spelling/q.svg',
    },
    {
      id: 'R',
      letter: 'assets/images/abc-learn/r.webp',
      handSignUrl: 'assets/images/spelling/r.svg',
    },
    {
      id: 'S',
      letter: 'assets/images/abc-learn/s.webp',
      handSignUrl: 'assets/images/spelling/s.svg',
    },
    {
      id: 'T',
      letter: 'assets/images/abc-learn/t.webp',
      handSignUrl: 'assets/images/spelling/t.svg',
    },
    {
      id: 'U',
      letter: 'assets/images/abc-learn/u.webp',
      handSignUrl: 'assets/images/spelling/u.svg',
    },
    {
      id: 'V',
      letter: 'assets/images/abc-learn/v.webp',
      handSignUrl: 'assets/images/spelling/v.svg',
    },
    {
      id: 'W',
      letter: 'assets/images/abc-learn/w.webp',
      handSignUrl: 'assets/images/spelling/w.svg',
    },
    {
      id: 'X',
      letter: 'assets/images/abc-learn/x.webp',
      handSignUrl: 'assets/images/spelling/x.svg',
    },
    {
      id: 'Y',
      letter: 'assets/images/abc-learn/y.webp',
      handSignUrl: 'assets/images/spelling/y.svg',
    },
    {
      id: 'Z',
      letter: 'assets/images/abc-learn/z.webp',
      handSignUrl: 'assets/images/spelling/z.svg',
    },
  ];

  // State
  currentLetter: Letter;
  learnedLetters: string[] = [];

  constructor(private router: Router) {
    addIcons({ school });
    this.currentLetter = this.letters[0]; // Default to 'A'
  }

  ngOnInit() {
    // Load user profile from localStorage
    try {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        const userData = JSON.parse(profile);
        this.userName = userData.name || 'Babu';
        this.userAvatar = userData.avatar || '';
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }

    // Load learned letters from localStorage
    this.loadLearnedLetters();
  }

  // Select Letter
  selectLetter(letter: Letter): void {
    this.currentLetter = letter;
    console.log('Selected letter:', letter.letter);
  }

  // Mark Current Letter as Learned
  markCurrentAsLearned(): void {
    if (this.isLetterLearned(this.currentLetter.id)) {
      // Remove from learned letters
      this.learnedLetters = this.learnedLetters.filter(
        (id) => id !== this.currentLetter.id
      );
    } else {
      // Add to learned letters
      this.learnedLetters.push(this.currentLetter.id);
    }

    this.saveLearnedLetters();
    console.log('Toggled learned status for:', this.currentLetter.letter);
  }

  // Check if Letter is Learned
  isLetterLearned(letterId: string): boolean {
    return this.learnedLetters.includes(letterId);
  }

  // Save Learned Letters to localStorage
  saveLearnedLetters(): void {
    localStorage.setItem('learnedLetters', JSON.stringify(this.learnedLetters));
  }

  // Load Learned Letters from localStorage
  loadLearnedLetters(): void {
    const saved = localStorage.getItem('learnedLetters');
    if (saved) {
      this.learnedLetters = JSON.parse(saved);
    }
  }
}
