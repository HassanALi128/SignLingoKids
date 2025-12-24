import { Component, EnvironmentInjector, inject, OnInit } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonLabel,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  triangle,
  ellipse,
  square,
  library,
  school,
  settings,
  home,
  star,
} from 'ionicons/icons';
import { QuizService } from '../services/quiz';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonIcon, IonTabs, IonTabBar, IonTabButton, IonLabel],
})
export class TabsPage implements OnInit {
  public environmentInjector = inject(EnvironmentInjector);
  isPremium: boolean = false;

  constructor(private quizService: QuizService) {
    addIcons({
      triangle,
      ellipse,
      square,
      library,
      school,
      settings,
      home,
      star,
    });
  }

  ngOnInit() {
    this.quizService.isPremium$.subscribe((status) => {
      this.isPremium = status;
    });
  }
}
