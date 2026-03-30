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
  settingsOutline,
} from 'ionicons/icons';
import { QuizService } from '../services/quiz';
import { MonetizationService } from '../services/monetization.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonLabel, IonIcon],
})
export class TabsPage implements OnInit {
  public environmentInjector = inject(EnvironmentInjector);
  isPremium: boolean = false;

  constructor(
    private quizService: QuizService,
    private monetizationService: MonetizationService
  ) {
    addIcons({
      triangle,
      ellipse,
      square,
      library,
      school,
      settingsOutline,
      home,
      star,
    });
  }

  ngOnInit() {
    this.quizService.isPremium$.subscribe((status: boolean) => {
      this.isPremium = status;
    });
  }
  // Banner logic formally removed; child pages control display sequences directly now.
}
