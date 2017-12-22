import {Component, Input, Renderer2, ViewChild, ElementRef, Output, EventEmitter, Type, AfterViewInit, OnChanges, OnDestroy, SimpleChanges} from '@angular/core';
import {ImageCropper} from './imageCropper';
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
    
    @Input() public cropperSrc:ImageCropper;
     @Input() public cropperDest:ImageCropper;
     
    @Input() public zoomPosition:ZoomPosition;
    
    @Output() public cropPositionChange:EventEmitter<CropPosition> = new EventEmitter<CropPosition>();

    @Output() public onCrop:EventEmitter<any> = new EventEmitter();

    public croppedWidth:number;
    public croppedHeight:number;
    public intervalRef:number;
    public raf:number;
    public renderer:Renderer2;
    public windowListener: EventListenerObject;

    private isCropPositionUpdateNeeded:boolean;

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

        if (!this.cropperSrc) {
            this.cropperSrc = new ImageCropper(this.settings);
        }
        if (!this.cropperDest) {
            this.cropperDest = new ImageCropper(this.settings);
        }

        this.cropperSrc.prepare(canvas);
        this.cropperDest.prepare(canvas);
    }

    public ngOnChanges(changes:SimpleChanges):void {
        if (this.isCropPositionChanged(changes)) {
            this.cropperSrc.updateCropPosition(this.zoomPosition.src.toBounds());
            this.cropperDest.updateCropPosition(this.zoomPosition.dest.toBounds());
 
            if (this.cropperSrc.isImageSet()) {
                let bounds = this.cropperSrc.getCropBounds();
                this.image.image = this.cropperSrc.getCroppedImageHelper().src;
                this.onCrop.emit(bounds);
            }
            if (this.cropperDest.isImageSet()) {
                let bounds = this.cropperDest.getCropBounds();
                this.image.image = this.cropperDest.getCroppedImageHelper().src;
                this.onCrop.emit(bounds);
            }
            this.updateCropBounds();
        }

        if (changes.inputImage) {
          this.setImage(changes.inputImage.currentValue);
        }
    }

    public ngOnDestroy() {
        if (this.settings.dynamicSizing && this.windowListener) {
            window.removeEventListener('resize', this.windowListener);
        }
    }

    public onTouchMove(event:TouchEvent):void {
        this.cropperSrc.onTouchMove(event);
        //this.cropperDest.onTouchMove(event);
    }

    public onTouchStart(event:TouchEvent):void {
        this.cropperSrc.onTouchStart(event);
        //this.cropperDest.onTouchStart(event);
    }

    public onTouchEnd(event:TouchEvent):void {
        this.cropperSrc.onTouchEnd(event);
        if (this.cropperSrc.isImageSet()) {
            this.image.image = this.cropperSrc.getCroppedImageHelper().src;
            this.onCrop.emit(this.cropperSrc.getCropBounds());
            this.updateCropBounds();
        }
    }

    public onMouseDown(event:MouseEvent):void {
        this.cropperSrc.onMouseDown(event);
    }

    public onMouseUp(event:MouseEvent):void {
        if (this.cropperSrc.isImageSet()) {
            this.cropperSrc.onMouseUp(event);
            this.image.image = this.cropperSrc.getCroppedImageHelper().src;
            this.onCrop.emit(this.cropperSrc.getCropBounds());
            this.updateCropBounds();
        }
    }

    public onMouseMove(event:MouseEvent):void {
        this.cropperSrc.onMouseMove(event);
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
        this.cropperSrc.resizeCanvas(canvas.offsetWidth, canvas.offsetHeight, true);
        this.cropperDest.resizeCanvas(canvas.offsetWidth, canvas.offsetHeight, true);
    }

    public reset():void {
        this.cropperSrc.reset();
        this.cropperDest.reset();
        this.renderer.setAttribute(this.cropcanvas.nativeElement, 'class', this.settings.cropperClass);
        this.image.image = this.cropperSrc.getCroppedImageHelper().src;
    }

    public setImage(image:HTMLImageElement, newBounds:any = null) {
        this.renderer.setAttribute(this.cropcanvas.nativeElement, 'class', `${this.settings.cropperClass} ${this.settings.croppingClass}`);
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
                        this.cropperSrc.resizeCanvas(canvas.offsetWidth, canvas.offsetHeight, false);
                        this.cropperDest.resizeCanvas(canvas.offsetWidth, canvas.offsetHeight, false);
                    }

                    this.cropperSrc.setImage(img);
                    this.cropperDest.setImage(img);
                    if (this.zoomPosition.src && this.zoomPosition.src.isInitialized()) {
                        this.cropperSrc.updateCropPosition(this.zoomPosition.src.toBounds());
                    }
                    if (this.zoomPosition.dest && this.zoomPosition.dest.isInitialized()) {
                        this.cropperDest.updateCropPosition(this.zoomPosition.dest.toBounds());
                    }

                    this.image.original = img;
                    let bounds = this.cropperSrc.getCropBounds();
                    this.image.image = this.cropperSrc.getCroppedImageHelper().src;

                    if (!this.image) {
                        this.image = image;
                    }

                    if (newBounds != null) {
                        bounds = newBounds;
                        this.cropperSrc.setBounds(bounds);
                        this.cropperSrc.updateCropPosition(bounds);
                    }
                    this.onCrop.emit(bounds);
                });
            }
        });
    }

    private isCropPositionChanged(changes:SimpleChanges):boolean {
        if (this.cropperSrc && changes['cropPosition'] && this.isCropPositionUpdateNeeded) {
            return true;
        } else {
            this.isCropPositionUpdateNeeded = true;
            return false;
        }
    }

    private updateCropBounds():void {
        let cropBound:Bounds = this.cropperSrc.getCropBounds();
        this.cropPositionChange.emit(new CropPosition(cropBound.left, cropBound.top, cropBound.width, cropBound.height));
        this.isCropPositionUpdateNeeded = false;
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
