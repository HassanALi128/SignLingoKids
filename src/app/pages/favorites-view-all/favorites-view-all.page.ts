import { Component, OnInit } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, heart, trash } from 'ionicons/icons';
import { FavoritesService, FavoriteItem } from '../../services/favorites';

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
    private favoritesService: FavoritesService
  ) {
    addIcons({ arrowBack, heart, trash });
  }

  ngOnInit() {
    this.loadFavorites();
  }

  ionViewWillEnter() {
    // Reload favorites when returning to this page
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

  removeFavorite(item: FavoriteItem, event: Event) {
    event.stopPropagation();
    this.favoritesService.removeFavorite(item.id);
    this.loadFavorites();
  }

  navigateToItem(item: FavoriteItem) {
    if (item.route) {
      this.navController.navigateForward(item.route);
    }
  }

  goBack() {
    this.navController.back();
  }
}
