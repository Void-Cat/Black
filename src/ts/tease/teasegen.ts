import { isNullOrUndefined, isBoolean } from 'util'
import * as fs from 'fs';

class TeaseGenerator {
    public cardlist = {}
    public category = {
        raw: {},
        /** Adds a category to the list. */
        add: (name: string, ratio?: number) => {
            if (isNullOrUndefined(this.category.raw[name.toLowerCase()])) {
                if (!isNullOrUndefined(ratio))
                    if (ratio > 1) ratio = ratio / 100
                this.category.raw[name.toLowerCase()] = {
                    name: name,
                    ratio: ratio || 0
                }
                return true
            } else return false
        },
        /** Gets or modifies the amount of cards in the specified category. */
        amount: (name: string, newratio?: number) => {
            if (isNullOrUndefined(newratio)) {
                if (isNullOrUndefined(this.category.raw[name.toLowerCase()])) return -1
                else return this.category.raw[name.toLowerCase()].ratio
            } else {
                if (isNullOrUndefined(this.category.raw[name.toLowerCase()])) return -1
                else {
                    this.category.raw[name.toLowerCase()].ratio = newratio
                    return newratio
                }
            }
        },
        /** Removes a category from the list. */
        remove: (name: string) => { // Remove a category
            if (isNullOrUndefined(this.category.raw[name.toLowerCase()])) return false
            delete this.category.raw[name.toLowerCase()]
            return true
        }
    }
    public infinite: boolean
    imageRatio: number
    sg: SlideGenerator = new SlideGenerator()
    public pathlist: string[] = [] 

    constructor(options?: object) {
        if (isBoolean(options['infinite'])) this.infinite = options['infinite']
        this.imageRatio = (storage.get('settings.cardratio') || 10) / 100
        if (isNullOrUndefined(options['categories']) && storage.get('teaseParams.loadSetup') == true) {
            
        }
    }

    /** Generates slides for the tease. */
    public generate(amount: number, pregen?: string) {
        if (!isNullOrUndefined(pregen) && (fs.lstatSync(pregen)).isFile()) {
            let data = JSON.parse(fs.readFileSync(pregen, {encoding: 'utf-8'}))
            this.category.raw = data.categories
            this.pathlist = data.pathlist
            this.cardlist = data.cardlist
            this.infinite = data.infinite || false
            return true
        }
        this.simplexCategoryRatios()
        for (let n = 0; n < amount; n++) {
            if (Math.random() < this.imageRatio) {
                
            }
        }
    }

    /** Redistributes cardratios to make sure they align properly. */
    public simplexCategoryRatios() {
        let total = 0
        Object.keys(this.category.raw).forEach((key) => {
            total += this.category.raw[key].ratio
        })
        if (total != 100) {
            Object.keys(this.category.raw).forEach((key) => {
                this.category.raw[key].ratio = this.category.raw[key].ratio / total * 100
            })
        }
    }
}

class SlideGenerator {
    public cardPaths: string[][] = []
    public imagePaths: string[] = []

    constructor(preventDuplicateCards = false, preventDuplicateImages = false) {
        if (preventDuplicateCards)
            this.cardPaths = this.retrieveAllCards()
        if (preventDuplicateImages)
            this.imagePaths = this.retrieveAllImages()
    }

    retrieveAllCards(path?: string) : string[][] {
        if (isNullOrUndefined(path)) {
            path = storage.get('teaseslave.teaseParams.cardFolder')[0]
        }
        let rawcards = this.retrieveImageFiles(path)
        
    }

    retrieveImageFiles(path: string, recurse = true) : string[] {
        let found : string[] = []
        let folder : string[] = fs.readdirSync(path)
        for (let file in folder) {
            file = file.toLowerCase()
            if (file.endsWith('.png') || 
                file.endsWith('.jpg') ||
                file.endsWith('.jpeg') ||
                file.endsWith('.bmp') ||
                file.endsWith('.gif') ||
                file.endsWith('.mp4') ||
                file.endsWith('.webm') ||
                file.endsWith('.m4v')) {
                found.push(file)
            } else if (recurse) {
                let lstat = fs.lstatSync(file)
                if (lstat.isDirectory() && file.indexOf('deleted') == -1)
                    found.concat(this.retrieveImageFiles(file))
            }
        }
        return found
    }
}