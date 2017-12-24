import {Bounds} from './model/bounds';
import {CornerMarker} from './model/cornerMarker';
import {CropTouch} from './model/cropTouch';
import {CropperSettings} from './cropperSettings';
import {DragMarker} from './model/dragMarker';
import {ImageZoompanModel, ZoomFrame} from './model/imageZoompanModel';
import {ImageCropper} from './imageCropper';
import {ImageCropperDataShare} from './imageCropperDataShare';
import {PointPool} from './model/pointPool';
import {Point} from './model/point';
import {ICornerMarker} from './model/cornerMarker';

export class ImageZoompan extends ImageZoompanModel {

    private crop:ImageZoompan;
    private cropperSettings:CropperSettings;
    private previousDistance:number;

    constructor(cropperSettings:CropperSettings) {
        super();

        let x:number = 0;
        let y:number = 0;
        let width:number = cropperSettings.width;
        let height:number = cropperSettings.height;
        let keepAspect:boolean = cropperSettings.keepAspect;
        let touchRadius:number = cropperSettings.touchRadius;
        let centerTouchRadius:number = cropperSettings.centerTouchRadius;
        let minWidth:number = cropperSettings.minWidth;
        let minHeight:number = cropperSettings.minHeight;
        let croppedWidth:number = cropperSettings.croppedWidth;
        let croppedHeight:number = cropperSettings.croppedHeight;

        this.cropperSettings = cropperSettings;

        this.src = new ZoomFrame();
        this.dest = new ZoomFrame();
        this.activeFrame = 'src';

        this.crop = this;
        this.x = x;
        this.y = y;

        if (width === void 0) {
            this.width = 100;
        }
        if (height === void 0) {
            this.height = 50;
        }
        if (keepAspect === void 0) {
            this.keepAspect = true;
        }
        if (touchRadius === void 0) {
            this.touchRadius = 20;
        }
        this.minWidth = minWidth;
        this.minHeight = minHeight;
        this.keepAspect = false;
        this.aspectRatio = 0;
        this.currentDragTouches = [];
        this.isMouseDown = false;
        this.ratioW = 1;
        this.ratioH = 1;
        this.fileType = cropperSettings.fileType;
        this.imageSet = false;
        this.pointPool = new PointPool(200);
        

        for(let i in {"src":0, "dest":1}){
        
          this[i].tl = new CornerMarker(x, y, touchRadius, this.cropperSettings);
          this[i].tr = new CornerMarker(x + width, y, touchRadius, this.cropperSettings);
          this[i].bl = new CornerMarker(x, y + height, touchRadius, this.cropperSettings);
          this[i].br = new CornerMarker(x + width, y + height, touchRadius, this.cropperSettings);
              
          this[i].tl.addHorizontalNeighbour(this[i].tr);
          this[i].tl.addVerticalNeighbour(this[i].bl);
          this[i].tr.addHorizontalNeighbour(this[i].tl);
          this[i].tr.addVerticalNeighbour(this[i].br);
          this[i].bl.addHorizontalNeighbour(this[i].br);
          this[i].bl.addVerticalNeighbour(this[i].tl);
          this[i].br.addHorizontalNeighbour(this[i].bl);
          this[i].br.addVerticalNeighbour(this[i].tr);
          this[i].markers = [this[i].tl, this[i].tr, this[i].bl, this[i].br];
          this[i].center = new DragMarker(x + (width / 2), y + (height / 2), centerTouchRadius, this.cropperSettings);
        }
        
        this.keepAspect = keepAspect;
        this.aspectRatio = height / width;
        this.croppedImage = new Image();
        this.currentlyInteracting = false;
        this.cropWidth = croppedWidth;
        this.cropHeight = croppedHeight;
    }

 

    private getDataUriMimeType(dataUri:string) {
        // Get a substring because the regex does not perform well on very large strings. Cater for optional charset. Length 50 shoould be enough.
        let dataUriSubstring = dataUri.substring(0, 50);
        let mimeType = 'image/png';
        // data-uri scheme
        // data:[<media type>][;charset=<character set>][;base64],<data>
        let regEx = RegExp(/^(data:)([\w\/\+]+);(charset=[\w-]+|base64).*,(.*)/gi);
        let matches = regEx.exec(dataUriSubstring);
        if (matches && matches[2]) {
            mimeType = matches[2];
            if (mimeType == 'image/jpg') {
                mimeType = 'image/jpeg';
            }
        }
        return mimeType;
    }

    public prepare(canvas:HTMLCanvasElement) {
        this.buffer = document.createElement('canvas');
        this.cropCanvas = document.createElement('canvas');

        // todo get more reliable parent width value.
        let responsiveWidth:number = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
        if (responsiveWidth > 0 && this.cropperSettings.dynamicSizing) {
            this.cropCanvas.width = responsiveWidth;
            this.buffer.width = responsiveWidth;
            canvas.width = responsiveWidth;
        } else {
            this.cropCanvas.width = this.cropWidth;
            this.buffer.width = canvas.width;
        }

        this.cropCanvas.height = this.cropHeight;
        this.buffer.height = canvas.height;
        this.canvas = canvas;
        this.ctx = <CanvasRenderingContext2D> this.canvas.getContext('2d');

        this.draw(this.ctx);
    }

    public resizeCanvas(width:number, height:number, setImage:boolean = false):void {
        this.canvas.width = this.cropCanvas.width = this.width = this.canvasWidth = this.buffer.width = width;
        this.canvas.height = this.cropCanvas.height = this.height = this.canvasHeight = this.buffer.height = height;
        if (setImage) {
            this.setImage(this.srcImage);
        }
    }

    public reset():void {
        this.setImage(undefined);
    }

    public draw(ctx:CanvasRenderingContext2D):void {
        if (this.srcImage) {
            ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            let sourceAspect:number = this.srcImage.height / this.srcImage.width;
            let canvasAspect:number = this.canvasHeight / this.canvasWidth;
            let w:number = this.canvasWidth;
            let h:number = this.canvasHeight;
            if (canvasAspect > sourceAspect) {
                w = this.canvasWidth;
                h = this.canvasWidth * sourceAspect;
            } else {
                h = this.canvasHeight;
                w = this.canvasHeight / sourceAspect;
            }
            this.ratioW = w / this.srcImage.width;
            this.ratioH = h / this.srcImage.height;
            if (canvasAspect < sourceAspect) {
                this.drawImageIOSFix(ctx, this.srcImage, 0, 0, this.srcImage.width, this.srcImage.height,
                    this.buffer.width / 2 - w / 2, 0, w, h);
            } else {
                this.drawImageIOSFix(ctx, this.srcImage, 0, 0, this.srcImage.width, this.srcImage.height, 0,
                    this.buffer.height / 2 - h / 2, w, h);
            }
            (<CanvasRenderingContext2D> this.buffer.getContext('2d'))
                .drawImage(this.canvas, 0, 0, this.canvasWidth, this.canvasHeight);

            
            let startArrow = this.src.center.position,
                endArrow = this.dest.center.position,
//                startIntercept = this.findIterceptionPoint([this.src.center.position, this.dest.center.position], this.src.markers, this.src.center.position),
                endIntercept = this.findIterceptionPoint([startArrow, endArrow], this.dest.markers, this.dest.center.position);
//                startArrow = (startIntercept) ? startIntercept : startArrow;
                endArrow = (endIntercept) ? endIntercept : endArrow;

            this.drawZoomArrow(ctx, startArrow, endArrow);
           
            
            ctx.lineWidth = this.cropperSettings.cropperDrawSettings.strokeWidth;
            ctx.strokeStyle = this.cropperSettings.cropperDrawSettings.strokeColor; // 'rgba(255,228,0,1)';
            
            let types = ["src", "dest"], bFirst = false;
            types.sort((a,b)=>a==this.activeFrame? 1 : -1);
            for(let i in types){
              let type = types[i];
            
              let bounds:Bounds = this.getBounds(type);
              if (!this.cropperSettings.rounded) {
                  if(!bFirst){
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
                    bFirst = true;
                  }
                  ctx.drawImage(this.buffer, bounds.left, bounds.top, Math.max(bounds.width, 1),
                      Math.max(bounds.height, 1), bounds.left, bounds.top, bounds.width, bounds.height);
                  ctx.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
              } else {
                  ctx.beginPath();
                  ctx.arc(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, bounds.width / 2, 0,
                      Math.PI * 2, true);
                  ctx.closePath();
                  ctx.stroke();
              }
  
              let marker:CornerMarker;
  
              for (let i = 0; i < this[type].markers.length; i++) {
                  marker = this[type].markers[i];
                  marker.draw(ctx);
              }
              this[type].center.draw(ctx);
            }
            
            
        } else {
            ctx.fillStyle = 'rgba(192,192,192,1)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    private findIterceptionPoint(line:Array<Point>, poly:Array<CornerMarker>, center:Point){
      let polywise = this.sortMarkerClockwise(poly, center);
      for(let i in polywise){
        let next = (!polywise[<number><any>i+1]) ? 0 : <number><any>i+1,
        intercept = this.findLineInterception(line[0].x, line[0].y, line[1].x, line[1].y, polywise[i].position.x, polywise[i].position.y, polywise[next].position.x, polywise[next].position.y);
 //       console.log(intercept);
        if(intercept){
          return intercept;
        }
      }
      
      return false;
    }
    private findLineInterception(x1:number, y1:number, x2:number, y2:number, x3:number, y3:number, x4:number, y4:number) {
      let ua, ub, denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);
      if (denom == 0) {
          return false;
      }
      ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3))/denom;
      ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3))/denom;
      return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1 ? new Point(x1 + ua*(x2 - x1), y1 + ua*(y2 - y1)) : false;
    }
    
    private drawZoomArrow(context:CanvasRenderingContext2D, from:Point, to:Point){
      var headlen = 10;   // length of head in pixels
      var angle = Math.atan2(to.y-from.y,to.x-from.x);
      context.lineWidth = 3;
      context.strokeStyle = 'rgb(255,255,255)';
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.lineTo(to.x-headlen*Math.cos(angle-Math.PI/6),to.y-headlen*Math.sin(angle-Math.PI/6));
      context.moveTo(to.x, to.y);
      context.lineTo(to.x-headlen*Math.cos(angle+Math.PI/6),to.y-headlen*Math.sin(angle+Math.PI/6));
      context.stroke();

    }
    
    public dragCenter(x:number, y:number, marker:DragMarker) {
        let bounds = this.getBounds(this.activeFrame);
        let left = x - (bounds.width / 2);
        let right = x + (bounds.width / 2);
        let top = y - (bounds.height / 2);
        let bottom = y + (bounds.height / 2);
        if (right >= this.maxXClamp) {
            x = this.maxXClamp - bounds.width / 2;
        }
        if (left <= this.minXClamp) {
            x = bounds.width / 2 + this.minXClamp;
        }
        if (top < this.minYClamp) {
            y = bounds.height / 2 + this.minYClamp;
        }
        if (bottom >= this.maxYClamp) {
            y = this.maxYClamp - bounds.height / 2;
        }
        this[this.activeFrame].tl.moveX(x - (bounds.width / 2));
        this[this.activeFrame].tl.moveY(y - (bounds.height / 2));
        this[this.activeFrame].tr.moveX(x + (bounds.width / 2));
        this[this.activeFrame].tr.moveY(y - (bounds.height / 2));
        this[this.activeFrame].bl.moveX(x - (bounds.width / 2));
        this[this.activeFrame].bl.moveY(y + (bounds.height / 2));
        this[this.activeFrame].br.moveX(x + (bounds.width / 2));
        this[this.activeFrame].br.moveY(y + (bounds.height / 2));
        marker.setPosition(x, y);
    }

    public enforceMinSize(x:number, y:number, marker:CornerMarker) {

        let xLength = x - marker.getHorizontalNeighbour().position.x;
        let yLength = y - marker.getVerticalNeighbour().position.y;
        let xOver = this.minWidth - Math.abs(xLength);
        let yOver = this.minHeight - Math.abs(yLength);

        if (xLength === 0 || yLength === 0) {
            x = marker.position.x;
            y = marker.position.y;

            return PointPool.instance.borrow(x, y);
        }

        if (this.keepAspect) {
            if (xOver > 0 && (yOver / this.aspectRatio) > 0) {
                if (xOver > (yOver / this.aspectRatio)) {
                    if (xLength < 0) {
                        x -= xOver;

                        if (yLength < 0) {
                            y -= xOver * this.aspectRatio;
                        } else {
                            y += xOver * this.aspectRatio;
                        }
                    } else {
                        x += xOver;
                        if (yLength < 0) {
                            y -= xOver * this.aspectRatio;
                        } else {
                            y += xOver * this.aspectRatio;
                        }
                    }
                } else {
                    if (yLength < 0) {
                        y -= yOver;

                        if (xLength < 0) {
                            x -= yOver / this.aspectRatio;
                        } else {
                            x += yOver / this.aspectRatio;
                        }

                    } else {
                        y += yOver;
                        if (xLength < 0) {
                            x -= yOver / this.aspectRatio;
                        } else {
                            x += yOver / this.aspectRatio;
                        }
                    }
                }
            } else {
                if (xOver > 0) {
                    if (xLength < 0) {
                        x -= xOver;
                        if (yLength < 0) {
                            y -= xOver * this.aspectRatio;
                        } else {
                            y += xOver * this.aspectRatio;
                        }
                    } else {
                        x += xOver;
                        if (yLength < 0) {
                            y -= xOver * this.aspectRatio;
                        } else {
                            y += xOver * this.aspectRatio;
                        }
                    }
                } else {
                    if (yOver > 0) {
                        if (yLength < 0) {
                            y -= yOver;

                            if (xLength < 0) {
                                x -= yOver / this.aspectRatio;
                            } else {
                                x += yOver / this.aspectRatio;
                            }
                        } else {
                            y += yOver;
                            if (xLength < 0) {
                                x -= yOver / this.aspectRatio;
                            } else {
                                x += yOver / this.aspectRatio;
                            }
                        }
                    }
                }
            }
        } else {
            if (xOver > 0) {
                if (xLength < 0) {
                    x -= xOver;
                } else {
                    x += xOver;
                }
            }
            if (yOver > 0) {
                if (yLength < 0) {
                    y -= yOver;
                } else {
                    y += yOver;
                }
            }
        }

        if (x < this.minXClamp || x > this.maxXClamp || y < this.minYClamp || y > this.maxYClamp) {
            x = marker.position.x;
            y = marker.position.y;
        }

        return PointPool.instance.borrow(x, y);
    }

    public dragCorner(x:number, y:number, marker:CornerMarker) {
        let iX:number = 0;
        let iY:number = 0;
        let ax:number = 0;
        let ay:number = 0;
        let newHeight:number = 0;
        let newWidth:number = 0;
        let newY:number = 0;
        let newX:number = 0;
        let anchorMarker:CornerMarker;
        let fold:number = 0;

        if (this.keepAspect) {
            anchorMarker = marker.getHorizontalNeighbour().getVerticalNeighbour();
            ax = anchorMarker.position.x;
            ay = anchorMarker.position.y;
            if (x <= anchorMarker.position.x) {
                if (y <= anchorMarker.position.y) {
                    iX = ax - (100 / this.aspectRatio);
                    iY = ay - (100 / this.aspectRatio * this.aspectRatio);
                    fold = this.getSide(PointPool.instance.borrow(iX, iY), anchorMarker.position,
                        PointPool.instance.borrow(x, y));
                    if (fold > 0) {
                        newHeight = Math.abs(anchorMarker.position.y - y);
                        newWidth = newHeight / this.aspectRatio;
                        newY = anchorMarker.position.y - newHeight;
                        newX = anchorMarker.position.x - newWidth;
                        let min = this.enforceMinSize(newX, newY, marker);
                        marker.move(min.x, min.y);
                        PointPool.instance.returnPoint(min);
                    } else {
                        if (fold < 0) {
                            newWidth = Math.abs(anchorMarker.position.x - x);
                            newHeight = newWidth * this.aspectRatio;
                            newY = anchorMarker.position.y - newHeight;
                            newX = anchorMarker.position.x - newWidth;
                            let min = this.enforceMinSize(newX, newY, marker);
                            marker.move(min.x, min.y);
                            PointPool.instance.returnPoint(min);
                        }
                    }
                } else {
                    iX = ax - (100 / this.aspectRatio);
                    iY = ay + (100 / this.aspectRatio * this.aspectRatio);
                    fold = this.getSide(PointPool.instance.borrow(iX, iY), anchorMarker.position,
                        PointPool.instance.borrow(x, y));
                    if (fold > 0) {
                        newWidth = Math.abs(anchorMarker.position.x - x);
                        newHeight = newWidth * this.aspectRatio;
                        newY = anchorMarker.position.y + newHeight;
                        newX = anchorMarker.position.x - newWidth;
                        let min = this.enforceMinSize(newX, newY, marker);
                        marker.move(min.x, min.y);
                        PointPool.instance.returnPoint(min);
                    } else {
                        if (fold < 0) {
                            newHeight = Math.abs(anchorMarker.position.y - y);
                            newWidth = newHeight / this.aspectRatio;
                            newY = anchorMarker.position.y + newHeight;
                            newX = anchorMarker.position.x - newWidth;
                            let min = this.enforceMinSize(newX, newY, marker);
                            marker.move(min.x, min.y);
                            PointPool.instance.returnPoint(min);
                        }
                    }
                }
            } else {
                if (y <= anchorMarker.position.y) {
                    iX = ax + (100 / this.aspectRatio);
                    iY = ay - (100 / this.aspectRatio * this.aspectRatio);
                    fold = this.getSide(PointPool.instance.borrow(iX, iY), anchorMarker.position,
                        PointPool.instance.borrow(x, y));
                    if (fold < 0) {
                        newHeight = Math.abs(anchorMarker.position.y - y);
                        newWidth = newHeight / this.aspectRatio;
                        newY = anchorMarker.position.y - newHeight;
                        newX = anchorMarker.position.x + newWidth;
                        let min = this.enforceMinSize(newX, newY, marker);
                        marker.move(min.x, min.y);
                        PointPool.instance.returnPoint(min);
                    } else {
                        if (fold > 0) {
                            newWidth = Math.abs(anchorMarker.position.x - x);
                            newHeight = newWidth * this.aspectRatio;
                            newY = anchorMarker.position.y - newHeight;
                            newX = anchorMarker.position.x + newWidth;
                            let min = this.enforceMinSize(newX, newY, marker);
                            marker.move(min.x, min.y);
                            PointPool.instance.returnPoint(min);
                        }
                    }
                } else {
                    iX = ax + (100 / this.aspectRatio);
                    iY = ay + (100 / this.aspectRatio * this.aspectRatio);
                    fold = this.getSide(PointPool.instance.borrow(iX, iY), anchorMarker.position,
                        PointPool.instance.borrow(x, y));
                    if (fold < 0) {
                        newWidth = Math.abs(anchorMarker.position.x - x);
                        newHeight = newWidth * this.aspectRatio;
                        newY = anchorMarker.position.y + newHeight;
                        newX = anchorMarker.position.x + newWidth;
                        let min = this.enforceMinSize(newX, newY, marker);
                        marker.move(min.x, min.y);
                        PointPool.instance.returnPoint(min);
                    } else {
                        if (fold > 0) {
                            newHeight = Math.abs(anchorMarker.position.y - y);
                            newWidth = newHeight / this.aspectRatio;
                            newY = anchorMarker.position.y + newHeight;
                            newX = anchorMarker.position.x + newWidth;
                            let min = this.enforceMinSize(newX, newY, marker);
                            marker.move(min.x, min.y);
                            PointPool.instance.returnPoint(min);
                        }
                    }
                }
            }
        } else {
            let min = this.enforceMinSize(x, y, marker);
            marker.move(min.x, min.y);
            PointPool.instance.returnPoint(min);
        }
        this[this.activeFrame].center.recalculatePosition(this.getBounds(this.activeFrame));
    }

    public getSide(a:Point, b:Point, c:Point):number {
        let n:number = ImageCropper.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));

        // TODO move the return of the pools to outside of this function
        PointPool.instance.returnPoint(a);
        PointPool.instance.returnPoint(c);
        return n;
    }

    public handleRelease(newCropTouch:CropTouch) {

        if (newCropTouch == null) {
            return;
        }
        let index = 0;
        for (let k = 0; k < this.currentDragTouches.length; k++) {
            if (newCropTouch.id === this.currentDragTouches[k].id) {
                this.currentDragTouches[k].dragHandle.setDrag(false);
                index = k;
            }
        }
        this.currentDragTouches.splice(index, 1);
        this.draw(this.ctx);
    }

    public handleMove(newCropTouch:CropTouch) {
        let matched = false;
        for (let k = 0; k < this.currentDragTouches.length; k++) {
            if (newCropTouch.id === this.currentDragTouches[k].id && this.currentDragTouches[k].dragHandle != null) {
                let dragTouch:CropTouch = this.currentDragTouches[k];
                let clampedPositions = this.clampPosition(newCropTouch.x - dragTouch.dragHandle.offset.x,
                    newCropTouch.y - dragTouch.dragHandle.offset.y);
                newCropTouch.x = clampedPositions.x;
                newCropTouch.y = clampedPositions.y;
                PointPool.instance.returnPoint(clampedPositions);
                if (dragTouch.dragHandle instanceof CornerMarker) {
                    this.dragCorner(newCropTouch.x, newCropTouch.y, (dragTouch.dragHandle as CornerMarker));
                } else {
                    this.dragCenter(newCropTouch.x, newCropTouch.y, (dragTouch.dragHandle as DragMarker));
                }
                this.currentlyInteracting = true;
                matched = true;
                ImageCropperDataShare.setPressed(this.canvas);
                break;
            }
        }
        if (!matched) {
            for (let i = 0; i < this[this.activeFrame].markers.length; i++) {
                let marker:ICornerMarker = this[this.activeFrame].markers[i];
                if (marker.touchInBounds(newCropTouch.x, newCropTouch.y)) {
                    newCropTouch.dragHandle = marker;
                    this.currentDragTouches.push(newCropTouch);
                    marker.setDrag(true);
                    newCropTouch.dragHandle.offset.x = newCropTouch.x - newCropTouch.dragHandle.position.x;
                    newCropTouch.dragHandle.offset.y = newCropTouch.y - newCropTouch.dragHandle.position.y;
                    this.dragCorner(newCropTouch.x - newCropTouch.dragHandle.offset.x,
                        newCropTouch.y - newCropTouch.dragHandle.offset.y, (newCropTouch.dragHandle as CornerMarker));
                    break;
                }
            }
            if (newCropTouch.dragHandle === null || typeof newCropTouch.dragHandle === 'undefined') {
                if (this[this.activeFrame].center.touchInBounds(newCropTouch.x, newCropTouch.y)) {
                    newCropTouch.dragHandle = this[this.activeFrame].center;
                    this.currentDragTouches.push(newCropTouch);
                    newCropTouch.dragHandle.setDrag(true);
                    newCropTouch.dragHandle.offset.x = newCropTouch.x - newCropTouch.dragHandle.position.x;
                    newCropTouch.dragHandle.offset.y = newCropTouch.y - newCropTouch.dragHandle.position.y;
                    this.dragCenter(newCropTouch.x - newCropTouch.dragHandle.offset.x,
                        newCropTouch.y - newCropTouch.dragHandle.offset.y, (newCropTouch.dragHandle as DragMarker));
                }
            }
        }
    }

    public updateClampBounds() {
        let sourceAspect = this.srcImage.height / this.srcImage.width;
        let canvasAspect = this.canvas.height / this.canvas.width;
        let w = this.canvas.width;
        let h = this.canvas.height;
        if (canvasAspect > sourceAspect) {
            w = this.canvas.width;
            h = this.canvas.width * sourceAspect;
        } else {
            h = this.canvas.height;
            w = this.canvas.height / sourceAspect;
        }
        this.minXClamp = this.canvas.width / 2 - w / 2;
        this.minYClamp = this.canvas.height / 2 - h / 2;
        this.maxXClamp = this.canvas.width / 2 + w / 2;
        this.maxYClamp = this.canvas.height / 2 + h / 2;
    }

    public getCropBounds(target:string = "src") {
        let bounds = this.getBounds(target);
        bounds.top = Math.round(( bounds.top - this.minYClamp) / this.ratioH);
        bounds.bottom = Math.round(( bounds.bottom - this.minYClamp) / this.ratioH);
        bounds.left = Math.round((bounds.left - this.minXClamp) / this.ratioW);
        bounds.right = Math.round((bounds.right - this.minXClamp) / this.ratioW);
        return bounds;
    }

    public clampPosition(x:number, y:number) {
        if (x < this.minXClamp) {
            x = this.minXClamp;
        }
        if (x > this.maxXClamp) {
            x = this.maxXClamp;
        }
        if (y < this.minYClamp) {
            y = this.minYClamp;
        }
        if (y > this.maxYClamp) {
            y = this.maxYClamp;
        }
        return PointPool.instance.borrow(x, y);
    }

    public isImageSet() {
        return this.imageSet;
    }

    public setImage(img:any) {
        this.srcImage = img;
        if (!img) {
            this.imageSet = false;
            this.draw(this.ctx);
        } else {
            this.imageSet = true;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            let bufferContext = <CanvasRenderingContext2D> this.buffer.getContext('2d');
            bufferContext.clearRect(0, 0, this.buffer.width, this.buffer.height);

            if (!this.cropperSettings.fileType)
                this.fileType = this.getDataUriMimeType(img.src);

            if (this.cropperSettings.minWithRelativeToResolution) {
                this.minWidth = (this.canvas.width * this.cropperSettings.minWidth / this.srcImage.width);
                this.minHeight = (this.canvas.height * this.cropperSettings.minHeight / this.srcImage.height);
            }

            this.updateClampBounds();
            this.canvasWidth = this.canvas.width;
            this.canvasHeight = this.canvas.height;

            this.setCropPosition(this.getCropPositionFromMarkers('src'), 'src');
            this.setCropPosition(this.getCropPositionFromMarkers('dest'), 'dest');
        }
    }

    public updateZoompanPosition(cropBoundsSrc:Bounds, cropBoundsDest:Bounds):void {
        
        if(this.keepAspect){
          this.aspectRatio = cropBoundsSrc.height / cropBoundsSrc.width;
        }
        
        this.setCropPosition(this.getCropPositionFromBounds(cropBoundsSrc), 'src');
        this.setCropPosition(this.getCropPositionFromBounds(cropBoundsDest), 'dest');
    }

    private setCropPosition(cropPosition:Point[], type:string = "src"):void {
        this[type].tl.setPosition(cropPosition[0].x, cropPosition[0].y);
        this[type].tr.setPosition(cropPosition[1].x, cropPosition[1].y);
        this[type].bl.setPosition(cropPosition[2].x, cropPosition[2].y);
        this[type].br.setPosition(cropPosition[3].x, cropPosition[3].y);
        this[type].center.setPosition(cropPosition[4].x, cropPosition[4].y);

        for (let position of cropPosition) {
            PointPool.instance.returnPoint(position);
        }

        this.vertSquashRatio = ImageCropper.detectVerticalSquash(this.srcImage);
        this.draw(this.ctx);
    }

    private getCropPositionFromMarkers(target:string = 'src'):Point[] {
        let w:number = this.canvas.width;
        let h:number = this.canvas.height;
        let tlPos:Point, trPos:Point, blPos:Point, brPos:Point, center:Point;
        let sourceAspect:number = this.srcImage.height / this.srcImage.width;
        let cropBounds:Bounds = this.getBounds(target);
        let cropAspect:number = cropBounds.height / cropBounds.width;
        let cX:number = this.canvas.width / 2;
        let cY:number = this.canvas.height / 2;

        if (cropAspect > sourceAspect) {
            let imageH = Math.min(w * sourceAspect, h);
            let cropW = imageH / cropAspect;
            tlPos = PointPool.instance.borrow(cX - cropW / 2, cY + imageH / 2);
            trPos = PointPool.instance.borrow(cX + cropW / 2, cY + imageH / 2);
            blPos = PointPool.instance.borrow(cX - cropW / 2, cY - imageH / 2);
            brPos = PointPool.instance.borrow(cX + cropW / 2, cY - imageH / 2);
        } else {
            let imageW = Math.min(h / sourceAspect, w);
            let cropH = imageW * cropAspect;
            tlPos = PointPool.instance.borrow(cX - imageW / 2, cY + cropH / 2);
            trPos = PointPool.instance.borrow(cX + imageW / 2, cY + cropH / 2);
            blPos = PointPool.instance.borrow(cX - imageW / 2, cY - cropH / 2);
            brPos = PointPool.instance.borrow(cX + imageW / 2, cY - cropH / 2);
        }

        center = PointPool.instance.borrow(cX, cY);
        let positions:Point[] = [tlPos, trPos, blPos, brPos, center];
        return positions;
    }

    private getCropPositionFromBounds(cropPosition:Bounds):Point[] {

        let marginTop = 0;
        let marginLeft = 0;
        let canvasAspect:number = this.canvasHeight / this.canvasWidth;
        let sourceAspect:number = this.srcImage.height / this.srcImage.width;

        if (canvasAspect > sourceAspect) {
            marginTop = this.buffer.height / 2 - (this.canvasWidth * sourceAspect) / 2;
        } else {
            marginLeft = this.buffer.width / 2 - (this.canvasHeight / sourceAspect) / 2;
        }

        let ratioW:number = (this.canvasWidth - marginLeft * 2) / this.srcImage.width;
        let ratioH:number = (this.canvasHeight - marginTop * 2) / this.srcImage.height;

        let actualH:number = cropPosition.height * ratioH;
        let actualW:number = cropPosition.width * ratioW;
        let actualX:number = cropPosition.left * ratioW + marginLeft;
        let actualY:number = cropPosition.top * ratioH + marginTop;

        if (this.keepAspect) {
            let scaledW:number = actualH / this.aspectRatio;
            let scaledH:number = actualW * this.aspectRatio;

            if (this.getCropBounds().height === cropPosition.height) { // only width changed
                actualH = scaledH;
            } else if (this.getCropBounds().width === cropPosition.width) { // only height changed
                actualW = scaledW;
            } else { // height and width changed
                if (Math.abs(scaledH - actualH) < Math.abs(scaledW - actualW)) {
                    actualW = scaledW;
                } else {
                    actualH = scaledH;
                }
            }
        }

        let tlPos:Point = PointPool.instance.borrow(actualX, actualY + actualH);
        let trPos:Point = PointPool.instance.borrow(actualX + actualW, actualY + actualH);
        let blPos:Point = PointPool.instance.borrow(actualX, actualY);
        let brPos:Point = PointPool.instance.borrow(actualX + actualW, actualY);
        let center:Point = PointPool.instance.borrow(actualX + actualW / 2, actualY + actualH / 2);

        let positions:Point[] = [tlPos, trPos, blPos, brPos, center];
        return positions;
    }

    public getBounds(type:string = 'src'):Bounds {
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE;
        let maxY = -Number.MAX_VALUE;
        for (let i = 0; i < this[type].markers.length; i++) {
            let marker = this[type].markers[i];
            if (marker.position.x < minX) {
                minX = marker.position.x;
            }
            if (marker.position.x > maxX) {
                maxX = marker.position.x;
            }
            if (marker.position.y < minY) {
                minY = marker.position.y;
            }
            if (marker.position.y > maxY) {
                maxY = marker.position.y;
            }
        }
        let bounds:Bounds = new Bounds();
        bounds.left = minX;
        bounds.right = maxX;
        bounds.top = minY;
        bounds.bottom = maxY;
        return bounds;
    }

    public setBounds(bounds:any, type:string = 'src') {

        let topLeft:CornerMarker;
        let topRight:CornerMarker;
        let bottomLeft:CornerMarker;
        let bottomRight:CornerMarker;

        let currentBounds = this.getBounds(type);
        for (let i = 0; i < this[type].markers.length; i++) {
            let marker = this[type].markers[i];

            if (marker.position.x === currentBounds.left) {
                if (marker.position.y === currentBounds.top) {
                    marker.setPosition(bounds.left, bounds.top);
                } else {
                    marker.setPosition(bounds.left, bounds.bottom);
                }
            } else {
                if (marker.position.y === currentBounds.top) {
                    marker.setPosition(bounds.right, bounds.top);
                } else {
                    marker.setPosition(bounds.right, bounds.bottom);
                }
            }
        }

        this[type].center.recalculatePosition(bounds);
        this[type].center.draw(this.ctx);
        this.draw(this.ctx); // we need to redraw all canvas if we have changed bounds
    }

    public onTouchMove(event:TouchEvent) {
        if (this.crop.isImageSet()) {
            event.preventDefault();
            if (event.touches.length === 1) {
                for (let i = 0; i < event.touches.length; i++) {
                    let touch = event.touches[i];
                    let touchPosition = ImageCropper.getTouchPos(this.canvas, touch);
                    let cropTouch = new CropTouch(touchPosition.x, touchPosition.y, touch.identifier);
                    PointPool.instance.returnPoint(touchPosition);
                    this.move(cropTouch);
                }
            } else {
                if (event.touches.length === 2) {

                    const distance = ((event.touches[0].clientX - event.touches[1].clientX) * (event.touches[0].clientX - event.touches[1].clientX)) + ((event.touches[0].clientY - event.touches[1].clientY) * (event.touches[0].clientY - event.touches[1].clientY));
                    if (this.previousDistance && this.previousDistance !== distance) {
                        let bounds = this.getBounds(this.activeFrame);

                        if (distance < this.previousDistance) {
                            bounds.top += 1;
                            bounds.left += 1;
                            bounds.right -= 1;
                            bounds.bottom -= 1;
                        }

                        if (distance > this.previousDistance) {
                            if (bounds.top !== this.minYClamp && bounds.bottom !== this.maxYClamp && bounds.left !== this.minXClamp && bounds.right !== this.maxXClamp) { // none
                                bounds.top -= 1;
                                bounds.left -= 1;
                                bounds.right += 1;
                                bounds.bottom += 1;
                            } else if (bounds.top !== this.minYClamp && bounds.bottom !== this.maxYClamp && bounds.left === this.minXClamp && bounds.right !== this.maxXClamp) { // left
                                bounds.top -= 1;
                                bounds.right += 2;
                                bounds.bottom += 1;
                            } else if (bounds.top !== this.minYClamp && bounds.bottom !== this.maxYClamp && bounds.left !== this.minXClamp && bounds.right === this.maxXClamp) { // right
                                bounds.top -= 1;
                                bounds.left -= 2;
                                bounds.bottom += 1;
                            } else if (bounds.top === this.minYClamp && bounds.bottom !== this.maxYClamp && bounds.left !== this.minXClamp && bounds.right !== this.maxXClamp) { // top
                                bounds.left -= 1;
                                bounds.right += 1;
                                bounds.bottom += 2;
                            } else if (bounds.top !== this.minYClamp && bounds.bottom === this.maxYClamp && bounds.left !== this.minXClamp && bounds.right !== this.maxXClamp) { // bottom
                                bounds.top -= 2;
                                bounds.left -= 1;
                                bounds.right += 1;
                            } else if (bounds.top === this.minYClamp && bounds.bottom !== this.maxYClamp && bounds.left === this.minXClamp && bounds.right !== this.maxXClamp) { // top left
                                bounds.right += 2;
                                bounds.bottom += 2;
                            } else if (bounds.top === this.minYClamp && bounds.bottom !== this.maxYClamp && bounds.left !== this.minXClamp && bounds.right === this.maxXClamp) { // top right
                                bounds.left -= 2;
                                bounds.bottom += 2;
                            } else if (bounds.top !== this.minYClamp && bounds.bottom === this.maxYClamp && bounds.left === this.minXClamp && bounds.right !== this.maxXClamp) { // bottom left
                                bounds.top -= 2;
                                bounds.right += 2;
                            } else if (bounds.top !== this.minYClamp && bounds.bottom === this.maxYClamp && bounds.left !== this.minXClamp && bounds.right === this.maxXClamp) { // bottom right
                                bounds.top -= 2;
                                bounds.left -= 2;
                            }
                        }

                        if (bounds.top < this.minYClamp) bounds.top = this.minYClamp;
                        if (bounds.bottom > this.maxYClamp) bounds.bottom = this.maxYClamp;
                        if (bounds.left < this.minXClamp) bounds.left = this.minXClamp;
                        if (bounds.right > this.maxXClamp) bounds.right = this.maxXClamp;

                        this.setBounds(bounds, this.activeFrame);
                    }
                    this.previousDistance = distance;
                }
            }
            this.draw(this.ctx);
        }
    }

    public onMouseMove(e:MouseEvent) {

        if (this.crop.isImageSet() && this.isMouseDown) {
            let mousePosition = ImageCropper.getMousePos(this.canvas, e);
            this.move(new CropTouch(mousePosition.x, mousePosition.y, 0));
            let dragTouch = this.getDragTouchForID(0);
            if (dragTouch) {
                dragTouch.x = mousePosition.x;
                dragTouch.y = mousePosition.y;
            } else {
                dragTouch = new CropTouch(mousePosition.x, mousePosition.y, 0);
            }
            PointPool.instance.returnPoint(mousePosition);
            this.drawCursors(dragTouch);
            this.draw(this.ctx);
        }
    }

    public move(cropTouch:CropTouch) {
        if (this.isMouseDown) {
            this.handleMove(cropTouch);
        }
    }

    public getDragTouchForID(id:any):CropTouch | undefined {
        for (let i = 0; i < this.currentDragTouches.length; i++) {
            if (id === this.currentDragTouches[i].id) {
                return this.currentDragTouches[i];
            }
        }
        return undefined;
    }

    public drawCursors(cropTouch:CropTouch) {
        let cursorDrawn = false;
        if (cropTouch != null) {
            if (cropTouch.dragHandle === this[this.activeFrame].center) {
                ImageCropperDataShare.setStyle(this.canvas, 'move');
                cursorDrawn = true;
            }
            if (cropTouch.dragHandle !== null && cropTouch.dragHandle instanceof CornerMarker) {

                this.drawCornerCursor(cropTouch.dragHandle, cropTouch.dragHandle.position.x,
                    cropTouch.dragHandle.position.y);
                cursorDrawn = true;
            }
        }
        let didDraw = false;
        if (!cursorDrawn) {
            for (let i = 0; i < this[this.activeFrame].markers.length; i++) {
                didDraw = didDraw || this.drawCornerCursor(this[this.activeFrame].markers[i], cropTouch.x, cropTouch.y);
            }
            if (!didDraw) {
                ImageCropperDataShare.setStyle(this.canvas, 'initial');
            }
        }
        if (!didDraw && !cursorDrawn && this[this.activeFrame].center.touchInBounds(cropTouch.x, cropTouch.y)) {
            this[this.activeFrame].center.setOver(true);
            ImageCropperDataShare.setOver(this.canvas);
            ImageCropperDataShare.setStyle(this.canvas, 'move');
        } else {
            this[this.activeFrame].center.setOver(false);
        }
    }

    public drawCornerCursor(marker:any, x:number, y:number) {
        if (marker.touchInBounds(x, y)) {
            marker.setOver(true);
            if (marker.getHorizontalNeighbour().position.x > marker.position.x) {
                if (marker.getVerticalNeighbour().position.y > marker.position.y) {
                    ImageCropperDataShare.setOver(this.canvas);
                    ImageCropperDataShare.setStyle(this.canvas, 'nwse-resize');
                } else {
                    ImageCropperDataShare.setOver(this.canvas);
                    ImageCropperDataShare.setStyle(this.canvas, 'nesw-resize');
                }
            } else {
                if (marker.getVerticalNeighbour().position.y > marker.position.y) {
                    ImageCropperDataShare.setOver(this.canvas);
                    ImageCropperDataShare.setStyle(this.canvas, 'nesw-resize');
                } else {
                    ImageCropperDataShare.setOver(this.canvas);
                    ImageCropperDataShare.setStyle(this.canvas, 'nwse-resize');
                }
            }
            return true;
        }
        marker.setOver(false);
        return false;
    }

    // todo: Unused param
    public onTouchStart(event:TouchEvent) {
      if(event.touches.length == 1){
        let mousePosition = ImageCropper.getTouchPos(this.canvas, event.touches[0]);
        if(this.isPointInside(mousePosition, this.src.markers, this.src.center.position)){
          this.activeFrame = 'src';
        }
        if(this.isPointInside(mousePosition, this.dest.markers, this.dest.center.position)){
          this.activeFrame = 'dest';
        }
      }
        if (this.crop.isImageSet()) {
            this.isMouseDown = true;
        }
    }

    public onTouchEnd(event:TouchEvent) {
        if (this.crop.isImageSet()) {
            for (let i = 0; i < event.changedTouches.length; i++) {
                let touch = event.changedTouches[i];
                let dragTouch = this.getDragTouchForID(touch.identifier);
                if (dragTouch && dragTouch !== undefined) {
                    if (dragTouch.dragHandle instanceof CornerMarker || dragTouch.dragHandle instanceof DragMarker) {
                        dragTouch.dragHandle.setOver(false);
                    }
                    this.handleRelease(dragTouch);
                }
            }

            if (this.currentDragTouches.length === 0) {
                this.isMouseDown = false;
                this.currentlyInteracting = false;
            }
        }
    }

    // http://stackoverflow.com/questions/11929099/html5-canvas-drawimage-ratio-bug-ios
    public drawImageIOSFix(ctx:CanvasRenderingContext2D, img:HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
                           sx:number, sy:number, sw:number, sh:number, dx:number, dy:number, dw:number,
                           dh:number) {

        // Works only if whole image is displayed:
        // ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh / vertSquashRatio);
        // The following works correct also when only a part of the image is displayed:
        // ctx.drawImage(img, sx * this.vertSquashRatio, sy * this.vertSquashRatio, sw * this.vertSquashRatio, sh *
        // this.vertSquashRatio, dx, dy, dw, dh);
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    public onMouseDown(event:MouseEvent) {
        let mousePosition = ImageCropper.getMousePos(this.canvas, event);
        if(this.isPointInside(mousePosition, this.src.markers, this.src.center.position)){
          this.activeFrame = 'src';
        }
        if(this.isPointInside(mousePosition, this.dest.markers, this.dest.center.position)){
          this.activeFrame = 'dest';
        }
        
        if (this.crop.isImageSet()) {
            this.isMouseDown = true;
        }
    }

    public onMouseUp(event:MouseEvent) {
        if (this.crop.isImageSet()) {
            ImageCropperDataShare.setReleased(this.canvas);
            this.isMouseDown = false;
            this.handleRelease(new CropTouch(0, 0, 0));
        }
    }
    public isPointInside(point: Point, markers: Array<CornerMarker>, center: Point) {
      // ray-casting algorithm based on
      // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
      // Sort points by clockwize
      // Sort from top to bottom
     markers = this.sortMarkerClockwise(markers, center);
      
      let inside = false;
      for (let i = 0, j = markers.length - 1; i < markers.length; j = i++) {
          let xi = markers[i].position.x, yi = markers[i].position.y;
          let xj = markers[j].position.x, yj = markers[j].position.y;
          let intersect = ((yi > point.y) != (yj > point.y))
              && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
      }
  
      return inside;
    }
    
    public sortMarkerClockwise(markers: Array<CornerMarker>, center: Point){
      return markers.sort((a,b) => {
          return Math.atan2(a.position.y - center.y,a.position.x - center.x) - Math.atan2(b.position.y - center.y,b.position.x - center.x);
      });
    }
}
