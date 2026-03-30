import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  NavController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, heart, trash } from 'ionicons/icons';
import { FavoritesService, FavoriteItem } from '../../services/favorites';
import { AlertService } from '../../services/alert.service';
import { Subscription } from 'rxjs';

interface GroupedFavorites {
  type: string;
  label: string;
  items: FavoriteItem[];
  icon: string;
}

@Component({
  selector: 'app-favorites-view-all',
  templateUrl: './favorites-view-all.page.html',
  styleUrls: ['./favorites-view-all.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
  ],
})
export class FavoritesViewAllPage implements OnInit {
  groupedFavorites: GroupedFavorites[] = [];
  totalFavorites: number = 0;

  private typeLabels: Record<string, { label: string; icon: string }> = {
    abc: { label: 'ABC Letters', icon: 'text-outline' },
    category: { label: 'Categories', icon: 'folder-outline' },
    sign: { label: 'Signs', icon: 'hand-left-outline' },
    quiz: { label: 'Quizzes', icon: 'help-circle-outline' },
  };

  constructor(
    private navController: NavController,
    private favoritesService: FavoritesService,
    private alertService: AlertService,
    private platform: Platform
  ) {
    addIcons({ arrowBack, heart, trash });
  }

  ngOnInit() {
    this.loadFavorites();
  }

  ionViewWillEnter() {
    this.loadFavorites();
  }

  private loadFavorites() {
    const allFavorites = this.favoritesService.getFavorites();
    this.totalFavorites = allFavorites.length;

    // Group favorites by type
    const grouped: Record<string, FavoriteItem[]> = {
      abc: [],
      category: [],
      sign: [],
      quiz: [],
    };

    allFavorites.forEach((item) => {
      if (grouped[item.type]) {
        grouped[item.type].push(item);
      }
    });

    // Convert to array format for template
    this.groupedFavorites = Object.entries(grouped)
      .filter(([_, items]) => items.length > 0)
      .map(([type, items]) => ({
        type,
        label: this.typeLabels[type]?.label || type,
        icon: this.typeLabels[type]?.icon || 'star-outline',
        items: items.sort((a, b) => b.addedAt - a.addedAt), // Sort by most recent
      }));
  }

  async removeFavorite(item: FavoriteItem, event: Event) {
    event.stopPropagation();

    const confirmed = await this.alertService.confirm(
      'Remove Favorite?',
      `Are you sure you want to remove "${item.name}" from your favorites?`,
      'Remove',
      'Cancel',
      'confirm'
    );

    if (confirmed) {
      this.favoritesService.removeFavorite(item.id);
      this.loadFavorites();
    }
  }

  navigateToItem(item: FavoriteItem) {
    if (!item.route) return;

    // Parse the saved route (e.g. /tabs/home?categoryId=XXX&signId=YYY)
    // and navigate to /tabs/home so the landing page opens the category inline.
    const url = new URL(item.route, window.location.origin);
    const categoryId = url.searchParams.get('categoryId');
    const signId = url.searchParams.get('signId');

    if (categoryId) {
      this.navController.navigateRoot('/tabs/home', {
        queryParams: { categoryId, signId: signId || null },
        animated: true,
        animationDirection: 'back',
      });
    } else {
      // Generic fallback
      this.navController.navigateForward(item.route);
    }
  }

  goBack() {
    this.navController.navigateBack('/tabs/home');
  }
}
