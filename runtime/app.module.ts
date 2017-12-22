import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import {ImageCropperComponent} from '../src/imageCropperComponent';
import {ImageZoompanComponent} from '../src/imageZoompanComponent';
import {CropperSettings} from '../src/cropperSettings';
import {Bounds} from '../src/model/bounds';

import { HttpModule } from '@angular/http';
import 'rxjs/Rx';

import { AppComponent } from './app';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

@NgModule({
    imports: [ BrowserModule, NgbModule.forRoot(), FormsModule ],
    declarations: [
        AppComponent, ImageCropperComponent, ImageZoompanComponent
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
