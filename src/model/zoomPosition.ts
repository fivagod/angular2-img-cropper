import { Bounds } from './bounds';
import { CropPosition } from './cropPosition';

export class ZoomPosition {

    public src:CropPosition;
    public dest:CropPosition;

    constructor(src:CropPosition, dest:CropPosition) {
        this.src = src;
        this.dest = dest;
    }

}
