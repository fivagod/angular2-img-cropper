import {Component, Input, Renderer2, ViewChild, ElementRef, Output, EventEmitter, Type, AfterViewInit, OnChanges, OnDestroy, SimpleChanges} from '@angular/core';
import {ImageZoompan} from './imageZoompan';
import {CropperSettings} from './cropperSettings';
import {Exif} from './exif';
import {Bounds} from './model/bounds';
import {CropPosition} from './model/cropPosition';
import {ZoomPosition} from './model/zoomPosition';

@Component({
    selector: 'img-zoompan',
    template: `
        <span class="ng2-imgcrop">
          <input *ngIf="!settings.noFileInput" type="file" accept="image/*" (change)="fileChangeListener($event)">
          <canvas #cropcanvas
                  (mousedown)="onMouseDown($event)"
                  (mouseup)="onMouseUp($event)"
                  (mousemove)="onMouseMove($event)"
                  (mouseleave)="onMouseUp($event)"
                  (touchmove)="onTouchMove($event)"
                  (touchend)="onTouchEnd($event)"
                  (touchstart)="onTouchStart($event)">
          </canvas>
        </span>
      `
})
export class ImageZoompanComponent implements AfterViewInit, OnChanges, OnDestroy {

    @ViewChild('cropcanvas', undefined) cropcanvas:ElementRef;

    @Input('settings') public settings:CropperSettings;
    @Input('image') public image:any;
    @Input('inputImage') public inputImage:any;
    
    @Input() public zoompan:ImageZoompan;
     
    @Input() public zoomPosition:ZoomPosition;
    
    @Output() public zoomPositionChange:EventEmitter<ZoomPosition> = new EventEmitter<ZoomPosition>();

    @Output() public onZoompan:EventEmitter<any> = new EventEmitter();

    public croppedWidth:number;
    public croppedHeight:number;
    public intervalRef:number;
    public raf:number;
    public renderer:Renderer2;
    public windowListener: EventListenerObject;

    private isZoomPositionUpdateNeeded:boolean;

    constructor(renderer:Renderer2) {
        this.renderer = renderer;
    }

    public ngAfterViewInit():void {
        let canvas:HTMLCanvasElement = this.cropcanvas.nativeElement;

        if (!this.settings) {
            this.settings = new CropperSettings();
        }

        if (this.settings.cropperClass) {
            this.renderer.setAttribute(canvas, 'class', this.settings.cropperClass);
        }

        if (!this.settings.dynamicSizing) {
            this.renderer.setAttribute(canvas, 'width', this.settings.canvasWidth.toString());
            this.renderer.setAttribute(canvas, 'height', this.settings.canvasHeight.toString());
        } else {
            this.windowListener = this.resize.bind(this);
            window.addEventListener('resize', this.windowListener);
        }

        if (!this.zoompan) {
            this.zoompan = new ImageZoompan(this.settings);
        }
 
        this.zoompan.prepare(canvas);
        
    }

    public ngOnChanges(changes:SimpleChanges):void {
        if (this.isZoomPositionChanged(changes)) {
            this.zoompan.updateZoompanPosition(this.zoomPosition.src.toBounds(), this.zoomPosition.dest.toBounds());
 
            if (this.zoompan.isImageSet()) {
                this.onZoompan.emit([this.zoompan.getCropBounds('src'), this.zoompan.getCropBounds('dest')]);
            }
            
            this.updateCropBounds();
        }

        if (changes.inputImage && changes.inputImage.currentValue) {
          this.setImage(changes.inputImage.currentValue);
        }
    }

    public ngOnDestroy() {
        if (this.settings.dynamicSizing && this.windowListener) {
            window.removeEventListener('resize', this.windowListener);
        }
    }

    public onTouchMove(event:TouchEvent):void {
        this.zoompan.onTouchMove(event);
    }

    public onTouchStart(event:TouchEvent):void {
        this.zoompan.onTouchStart(event);
    }

    public onTouchEnd(event:TouchEvent):void {
        this.zoompan.onTouchEnd(event);
        if (this.zoompan.isImageSet()) {
            this.onZoompan.emit([this.zoompan.getCropBounds('src'), this.zoompan.getCropBounds('dest')]);
            this.updateCropBounds();
        }
    }

    public onMouseDown(event:MouseEvent):void {
        this.zoompan.onMouseDown(event);
    }

    public onMouseUp(event:MouseEvent):void {
        if (this.zoompan.isImageSet()) {
            this.zoompan.onMouseUp(event);
            this.onZoompan.emit([this.zoompan.getCropBounds('src'), this.zoompan.getCropBounds('dest')]);
            this.updateCropBounds();
        }
    }

    public onMouseMove(event:MouseEvent):void {
        this.zoompan.onMouseMove(event);
    }

    public fileChangeListener($event:any) {
        if($event.target.files.length === 0) return;

        let file:File = $event.target.files[0];
        if (this.settings.allowedFilesRegex.test(file.name)) {
            let image:any = new Image();
            let fileReader:FileReader = new FileReader();

            fileReader.addEventListener('loadend', (loadEvent:any) => {
                image.addEventListener('load', () => {
                    this.setImage(image);
                });
                image.src = loadEvent.target.result;
            });

            fileReader.readAsDataURL(file);
        }
    }

    private resize() {
        let canvas:HTMLCanvasElement = this.cropcanvas.nativeElement;
        this.settings.canvasWidth = canvas.offsetWidth;
        this.settings.canvasHeight = canvas.offsetHeight;
        this.zoompan.resizeCanvas(canvas.offsetWidth, canvas.offsetHeight, true);
    }

    public reset():void {
        this.zoompan.reset();
        if(this.settings.cropperClass){
          this.renderer.setAttribute(this.cropcanvas.nativeElement, 'class', this.settings.cropperClass);
        }
    }
    public resizeCanvas(width:number, height:number, setImage:boolean = false):void{
        this.zoompan.resizeCanvas(width, height, setImage);
    }
    public setImage(image:HTMLImageElement) {
        if(this.settings.cropperClass){
          this.renderer.setAttribute(this.cropcanvas.nativeElement, 'class', `${this.settings.cropperClass} ${this.settings.croppingClass}`);
        }
        this.raf = window.requestAnimationFrame(() => {
            if (this.raf) {
                window.cancelAnimationFrame(this.raf);
            }
            if (image.naturalHeight > 0 && image.naturalWidth > 0) {

                image.height = image.naturalHeight;
                image.width = image.naturalWidth;

                window.cancelAnimationFrame(this.raf);
                this.getOrientedImage(image, (img:HTMLImageElement) => {
                    if (this.settings.dynamicSizing) {
                        let canvas:HTMLCanvasElement = this.cropcanvas.nativeElement;
                        this.settings.canvasWidth = canvas.offsetWidth;
                        this.settings.canvasHeight = canvas.offsetHeight;
                        this.zoompan.resizeCanvas(canvas.offsetWidth, canvas.offsetHeight, false);
                    }

                    this.zoompan.setImage(img);
                    
                    if (this.zoomPosition && this.zoomPosition.src && this.zoomPosition.src.isInitialized()) {
                        this.zoompan.updateZoompanPosition(this.zoomPosition.src.toBounds(), this.zoomPosition.dest.toBounds());
                    }
                    

                    this.image.original = img;
                    
                });
            }
        });
    }

    private isZoomPositionChanged(changes:SimpleChanges):boolean {
        if (this.zoompan && this.zoompan.isImageSet() && changes['zoomPosition'] && this.isZoomPositionUpdateNeeded) {
            return true;
        } else {
            this.isZoomPositionUpdateNeeded = true;
            return false;
        }
    }

    private updateCropBounds():void {
        let cropBoundSrc:Bounds = this.zoompan.getCropBounds("src");
        let cropBoundDest:Bounds = this.zoompan.getCropBounds("dest");
        this.zoomPositionChange.emit(
            new ZoomPosition(
              new CropPosition(cropBoundSrc.left, cropBoundSrc.top, cropBoundSrc.width, cropBoundSrc.height),
              new CropPosition(cropBoundDest.left, cropBoundDest.top, cropBoundDest.width, cropBoundDest.height)
            )
          );
        this.isZoomPositionUpdateNeeded = false;
    }

    private getOrientedImage(image:HTMLImageElement, callback:Function) {
        let img:any;

        Exif.getData(image, function () {
            let orientation = Exif.getTag(image, 'Orientation');

            if ([3, 6, 8].indexOf(orientation) > -1) {
                let canvas:HTMLCanvasElement = document.createElement('canvas'),
                    ctx:CanvasRenderingContext2D = <CanvasRenderingContext2D> canvas.getContext('2d'),
                    cw:number = image.width,
                    ch:number = image.height,
                    cx:number = 0,
                    cy:number = 0,
                    deg:number = 0;

                switch (orientation) {
                    case 3:
                        cx = -image.width;
                        cy = -image.height;
                        deg = 180;
                        break;
                    case 6:
                        cw = image.height;
                        ch = image.width;
                        cy = -image.height;
                        deg = 90;
                        break;
                    case 8:
                        cw = image.height;
                        ch = image.width;
                        cx = -image.width;
                        deg = 270;
                        break;
                    default:
                        break;
                }

                canvas.width = cw;
                canvas.height = ch;
                ctx.rotate(deg * Math.PI / 180);
                ctx.drawImage(image, cx, cy);
                img = document.createElement('img');
                img.width = cw;
                img.height = ch;
                img.addEventListener('load', function () {
                    callback(img);
                });
                img.src = canvas.toDataURL('image/png');
            } else {
                img = image;
                callback(img);
            }
        });
    }
}
