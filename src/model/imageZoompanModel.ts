import {PointPool} from './pointPool';
import {CornerMarker} from './cornerMarker';
import {DragMarker} from './dragMarker';
import {CropTouch} from './cropTouch';

export class ZoomFrame {
  constructor(){}
  public tl: CornerMarker;
  public tr: CornerMarker;
  public bl: CornerMarker;
  public br: CornerMarker;
  public markers: Array<CornerMarker>;
  public center: DragMarker;
}


export class ImageZoompanModel {
    public isMouseDown: boolean;
    protected canvas: HTMLCanvasElement;
    protected x: number;
    protected y: number;
    protected width: number;
    protected height: number;
    protected canvasWidth: number;
    protected canvasHeight: number;
    protected keepAspect: boolean;
    protected touchRadius: number;
    protected currentDragTouches: Array<CropTouch>;
    protected ratioW: number;
    protected ratioH: number;
    protected fileType: string;
    protected imageSet: boolean;
    protected pointPool: PointPool;
    protected buffer: HTMLCanvasElement;
    protected cropCanvas: HTMLCanvasElement;
    
    protected src: ZoomFrame;
    protected dest: ZoomFrame;
    protected activeFrame: string;
    
    protected ctx: CanvasRenderingContext2D;
    protected aspectRatio: number;
    protected currentlyInteracting: boolean;
    protected srcImage: HTMLImageElement;
    protected vertSquashRatio: number;
    protected minXClamp: number;
    protected minYClamp: number;
    protected maxXClamp: number;
    protected maxYClamp: number;
    protected minHeight: number;
    protected minWidth: number;
    protected cropWidth: number;
    protected cropHeight: number;
    protected croppedImage: HTMLImageElement;
    [key: string]: any;
}