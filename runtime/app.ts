import { AfterViewInit } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Component, ViewChild, Type } from '@angular/core';
import {ImageCropperComponent} from '../src/imageCropperComponent';
import {ImageZoompanComponent} from '../src/imageZoompanComponent';
import {CropperSettings} from '../src/cropperSettings';
import {Bounds} from '../src/model/bounds';
import {CropPosition} from '../src/model/cropPosition';
import {ZoomPosition} from '../src/model/zoomPosition';

@Component({
    selector: 'test-app',
    templateUrl: 'app.component.html'
})
export class AppComponent extends Type {

    //Cropper 1 data
    public data1:any;
    public cropperSettings1:CropperSettings;

    //Cropper 2 data
    public data2:any;
    public cropperSettings2:CropperSettings;

    @ViewChild('cropper1', undefined)
    public cropper1:ImageCropperComponent;

    @ViewChild('cropper2', undefined)
    public cropper2:ImageCropperComponent;

    @ViewChild('cropper3', undefined)
    public cropper3:ImageCropperComponent;

    @ViewChild('cropper4', undefined)
    public cropper4:ImageCropperComponent;
    
    @ViewChild('zoompan', undefined)
    public zoompan:ImageZoompanComponent;
    
    public onChange:Function;
    public updateCropPosition:Function;
    public resetCroppers:Function;

    //Cropper 3 data
    public data3:any;
    public cropperSettings3:CropperSettings;
    public cropPosition:CropPosition;

    //Cropper 4 data
    public cropperSettings4:CropperSettings;

    public data4: any;
    public getImage:any;
    
    // Zoompan 5 data
    public data5:any = {};
    public zoompanSettings:CropperSettings;
    public zoompanPosition:ZoomPosition;
    
    public updateZoompanPosition:Function;
    
    constructor() {
        super();

        this.cropperSettings1 = new CropperSettings();
        this.cropperSettings1.dynamicSizing = true;
        this.cropperSettings1.cropperClass = 'custom-class';
        this.cropperSettings1.croppingClass = 'cropping';
        this.cropperSettings1.width = 200;
        this.cropperSettings1.height = 200;

        this.cropperSettings1.croppedWidth = 200;
        this.cropperSettings1.croppedHeight = 200;

        this.cropperSettings1.canvasWidth = 500;
        this.cropperSettings1.canvasHeight = 300;

        this.cropperSettings1.minWidth = 100;
        this.cropperSettings1.minHeight = 100;

        this.cropperSettings1.rounded = false;

        this.cropperSettings1.cropperDrawSettings.strokeColor = 'rgba(255,255,255,1)';
        this.cropperSettings1.cropperDrawSettings.strokeWidth = 2;

        this.cropperSettings1.keepAspect = true;
        this.cropperSettings1.preserveSize = false;

        this.data1 = {};
        //this.data1 = new Image();
        //this.data1.crossOrigin = 'anonymous';
        //this.data1.src = "http://dlm16.meta.ua/out/2.jpg";

        //Cropper settings 2
        this.cropperSettings2 = new CropperSettings();
        this.cropperSettings2.width = 200;
        this.cropperSettings2.height = 200;
        this.cropperSettings2.keepAspect = false;

        this.cropperSettings2.croppedWidth = 200;
        this.cropperSettings2.croppedHeight = 200;

        this.cropperSettings2.canvasWidth = 500;
        this.cropperSettings2.canvasHeight = 300;

        this.cropperSettings2.minWidth = 100;
        this.cropperSettings2.minHeight = 100;

        this.cropperSettings2.rounded = true;
        this.cropperSettings2.minWithRelativeToResolution = false;

        this.cropperSettings2.cropperDrawSettings.strokeColor = 'rgba(255,255,255,1)';
        this.cropperSettings2.cropperDrawSettings.strokeWidth = 2;
        this.cropperSettings2.noFileInput = true;
        this.cropperSettings2.fileType = 'image/jpeg';

        this.data2 = {};

        //Cropper settings 3
        this.cropperSettings3 = new CropperSettings();
        this.cropperSettings3.width = 200;
        this.cropperSettings3.height = 250;
        this.cropperSettings3.keepAspect = true;

        this.cropperSettings3.croppedWidth = 200;
        this.cropperSettings3.croppedHeight = 250;

        this.cropperSettings3.canvasWidth = 500;
        this.cropperSettings3.canvasHeight = 300;

        this.cropperSettings3.minWidth = 100;
        this.cropperSettings3.minHeight = 100;

        this.cropperSettings3.rounded = false;
        this.cropperSettings3.preserveSize = true;
        this.cropperSettings3.minWithRelativeToResolution = false;

        this.cropperSettings3.cropperDrawSettings.strokeColor = 'rgba(255,255,255,1)';
        this.cropperSettings3.cropperDrawSettings.strokeWidth = 2;
        this.cropperSettings3.noFileInput = false;

        this.cropPosition = new CropPosition();
        this.cropPosition.x = 10;
        this.cropPosition.y = 10;
        this.cropPosition.w = 200;
        this.cropPosition.h = 250;

        this.data3 = {};
        
        //Cropper settings 4
        this.cropperSettings4 = new CropperSettings();
        this.cropperSettings4.width = 200;
        this.cropperSettings4.height = 200;

        this.cropperSettings4.croppedWidth = 200;
        this.cropperSettings4.croppedHeight = 200;

        this.cropperSettings4.canvasWidth = 500;
        this.cropperSettings4.canvasHeight = 300;

        this.cropperSettings4.minWidth = 100;
        this.cropperSettings4.minHeight = 100;

        this.cropperSettings4.rounded = false;

        this.cropperSettings4.cropperDrawSettings.strokeColor = 'rgba(255,255,255,1)';
        this.cropperSettings4.cropperDrawSettings.strokeWidth = 2;

        this.cropperSettings4.keepAspect = true;
        this.cropperSettings4.preserveSize = true;
        this.cropperSettings4.cropOnResize = false;

        this.data4 = {};

        this.getImage = () => {
          this.data4.image = this.cropper4.cropper.getCroppedImage(true).src;
        }

        this.onChange = ($event:any) => {
            var image:any = new Image();
            var file:File = $event.target.files[0];
            var myReader:FileReader = new FileReader();
            myReader.addEventListener('loadend', (loadEvent:any) => {
                image.src = loadEvent.target.result;
                this.cropper2.setImage(image);
            });

            myReader.readAsDataURL(file);
        }

        this.updateCropPosition = () => {
            this.cropPosition = new CropPosition(this.cropPosition.x, this.cropPosition.y, this.cropPosition.w, this.cropPosition.h);
        }
        
        //Zoompan settings 5
        this.zoompanSettings = new CropperSettings();
        this.zoompanSettings.width = 200;
        this.zoompanSettings.height = 250;
        this.zoompanSettings.keepAspect = true;
        this.zoompanSettings.noFileInput = true;
        
        this.zoompanSettings.croppedWidth = 200;
        this.zoompanSettings.croppedHeight = 250;
             
        this.zoompanSettings.canvasWidth = 500;
        this.zoompanSettings.canvasHeight = 300;
             
        this.zoompanSettings.minWidth = 100;
        this.zoompanSettings.minHeight = 100;
             
        this.zoompanSettings.rounded = false;
        this.zoompanSettings.preserveSize = true;
        this.zoompanSettings.minWithRelativeToResolution = false;
             
        this.zoompanSettings.cropperDrawSettings.strokeColor = 'rgba(0,0,0,0.1)';
        this.zoompanSettings.cropperDrawSettings.strokeWidth = 2;
             
        this.zoompanPosition = new ZoomPosition(new CropPosition(10, 10, 200, 250), new CropPosition(100, 100, 100, 150));

        let zoomimg = new Image();
        zoomimg.addEventListener("load", e => {
          this.data5 = zoomimg;
          let maxWidth = zoomimg.naturalWidth > window.screen.width*0.4  ? Math.round(window.screen.width*0.4) : zoomimg.naturalWidth,
              maxHeight = Math.round(zoomimg.naturalHeight * maxWidth/zoomimg.naturalWidth),
              width = zoomimg.naturalWidth,
              height = zoomimg.naturalHeight,
              
              aspect = 16/9,
              zoom = 1 + Math.round(Math.random()*20)/10, // 1x - 3x  
              // lets find start and end point for 16x9 frame with random zoomPosition
              direction = (zoomimg.naturalWidth/zoomimg.naturalHeight > aspect) ? /*album left-right*/ "lr" : /*portrait top-bottom*/"tb",
              corners = [
                new CropPosition(0, 0, Math.round(direction == "lr"? height*aspect : width), Math.round(direction == "lr"? height : width/aspect)),
                new CropPosition(width - Math.round((direction == "lr"? height*aspect : width)/zoom), height - Math.round((direction == "lr"? height : width/aspect)/zoom), Math.round((direction == "lr"? height*aspect : width)/zoom), Math.round((direction == "lr"? height : width/aspect)/zoom))
              ], 
              srcIdx = Math.round(Math.random());
              
          this.zoompanPosition = new ZoomPosition(corners[srcIdx], corners[1-srcIdx]);
          this.zoompan.resizeCanvas(maxWidth, maxHeight, true);
          

          
        });
        zoomimg.crossOrigin = 'anonymous';
        zoomimg.src = "http://dlm16.meta.ua/out/zm/tmp/4142a3b9568735e.jpg";
        
        
        this.updateZoompanPosition = () => {
            this.zoompanPosition =  new ZoomPosition(
                new CropPosition(this.zoompanPosition.src.x, this.zoompanPosition.src.y, this.zoompanPosition.src.w, this.zoompanPosition.src.h),
                new CropPosition(this.zoompanPosition.dest.x, this.zoompanPosition.dest.y, this.zoompanPosition.dest.w, this.zoompanPosition.dest.h),
            );
        }
        
        this.resetCroppers = () => {
            this.cropper1.reset();
            this.cropper2.reset();
            this.cropper3.reset();
            this.cropper4.reset();
            this.zoompan.reset();
        }
    }
}
