import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-init-loader',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './init-loader.component.html',
  styleUrls: ['./init-loader.component.scss'],
})
export class InitLoaderComponent {
  @Input() status: string = 'Starting up...';
  @Input() show: boolean = true;
}
