declare const storage, isNullOrUndefined, fs
import {Card} from './tease'

export default class ImageController {
    public cardratio: number
    cardmode: string
    public cards : Card[] = []
    categories: object
    public cil = {}
    public images : string[] = []
    public startcards : number[] = []
    length = 0
    localCards: any[][] = []
    localImages: string[] = []
    localUsedCards: any[][] = []
    localUsedImages: string[] = []
    public unending = false
    
    constructor(startingIndex = -1, unending = false) {
        if (startingIndex <= 1)
            startingIndex = -1
        this.unending = unending
        this.cardmode = storage.get('tease.setup.cardmode')
        this.categories = storage.get('tease.categories')
        this.findCards()
        this.localImages = this.findImages()
        this.cardratio = storage.get('settings.cardratio') / 100

        if (this.cardmode == 'percentage') {
            let startlength = storage.get('tease.setup.imagecount') * (1 + storage.get('settings.cardratio'))
            this.extend(startlength)
        } else if (this.cardmode == 'manual')
            this.extend(storage.get('tease.setup.imagecount'), true)
        else
            console.error('Selected cardmode failed to execute: ' + this.cardmode)
    }

    public extend(n?: number, buildmode = false) : void {
        if (isNullOrUndefined(n))
            n = this.length + 50

        let firstbuild = (this.length == 0)

        if (buildmode) {
            let cardTotal = 0
            Object.keys(this.categories).forEach((key) => {
                if (!isNaN(this.categories[key]['count']))
                    cardTotal += this.categories[key]['count']
            })
            let cardInsert = Math.floor(n / cardTotal)
            this.cardratio = cardTotal / (n + cardTotal)
            while (this.length < n) {
                let card = false
                if (cardTotal > 0)
                    if (cardInsert <= 1) {
                        if (Math.random() < 0.5)
                            card = true
                    } else
                        if (this.length % cardInsert == 0)
                            card = true
                if (card) {
                    cardTotal--
                    let card = this.getCard()
                    let index = this.images.length
                    this.images.push(card[0])
                    if (isNullOrUndefined(card[2]))
                        this.cil[index] = { category: card[1], cardindex: null }
                    else {
                        for (let ai = 0; ai < card[2].actions.length; ai++)
                            if (card[2].actions[ai]['start'].toLowerCase() === 'start') {
                                this.startcards.push(index)
                                break
                            }
                        this.cil[index] = { category: card[1], cardindex: this.cards.length }
                        this.cards.push(new Card(card[2], index))
                    }
                } else
                    this.images.push(this.getImage())
                this.length++
            }
        } else {
            while (this.length < n) {
                // Card or image
                if (Math.random() < this.cardratio) {
                    let card = this.getCard()
                    let index = this.images.length
                    if (firstbuild && card[2]['start'] == 'start')
                        this.startcards.push(index)
                    else if (!firstbuild && card[2]['start'] == 'start')
                        continue
                    this.images.push(card[0])
                    if (isNullOrUndefined(card[2]))
                        this.cil[index] = { category: card[1], cardindex: null }
                    else {
                        this.cil[index] = { category: card[1], cardindex: this.cards.length }
                        this.cards.push(new Card(card[2], index))
                    }
                } else
                    this.images.push(this.getImage())
                this.length++
            }
        }
    }

    getImage() : string {
        if (this.localImages.length == 0)
            this.localImages = this.localUsedImages
        let index = Math.floor(Math.random() * this.localImages.length)
        let image = this.localImages.splice(index, 1)[0]
        this.localUsedImages.push(image)
        return image
    }

    getCard() : any[] {
        if (this.localCards.length == 0)
            this.localCards = this.localUsedCards
        let index = Math.floor(Math.random() * this.localCards.length)
        let card = this.localCards.splice(index, 1)[0]
        this.localUsedCards.push(card)
        return card
    }

    findImages(folder?: string, recurse?: boolean) : string[] {
        if (isNullOrUndefined(folder))
            folder = storage.get('tease.setup.imagefolder')
        if (isNullOrUndefined(recurse))
            recurse = storage.get('tease.setup.recurseimagefolder')
        let dir = fs.readdirSync(folder)
        let result : string[] = []
        dir.forEach((path) => {
            let stat = fs.lstatSync(folder + '/' + path)
            if (stat.isDirectory() && recurse) {
                result = result.concat(this.findImages(folder + '/' + path, recurse))
            } else if (stat.isFile()) {
                if (path.match(/\.(jpg|jpeg|png|bmp|gif)$/i) != null)
                    result.push(folder + '/' + path)
            }
        })
        return result
    }

    findCards(folder?: string) : void {
        if (isNullOrUndefined(folder))
            folder = storage.get('tease.setup.cardfolder')

        let localControl = {}
        let raw = this.findImages(folder, true)
        raw.forEach((path) => {
            // Find the category for the card
            let bestmatch : any[] = [-1, null]
            Object.keys(this.categories).forEach((key) => {
                let name = this.categories[key].name.toLowerCase()
                let match = path.toLowerCase().lastIndexOf(name)
                if (match > bestmatch[0])
                    bestmatch = [match, key]
            })

            // Check result
            if (bestmatch[1] == null) {
                console.warn(`Card at path '${path}' couldn't be categorized.`)
                return
            }
            
            // Check for CTIS card
            let substrend = path.lastIndexOf('.')
            let ctispath = path.substring(0, substrend) + '.ctis'
            let ctis = null
            if (fs.existsSync(ctispath)) {
                try {
                    ctis = JSON.parse(fs.readFileSync(ctispath))
                } catch (e) {
                    console.warn('Failed to read CTIS card at ', ctispath)
                }
            }
            // Add the card if cardmode is ratio
            if (this.cardmode == 'percentage') {
                this.localCards.push([path, bestmatch[1], ctis])
            } else {
                if (this.categories[bestmatch[1]]['count'] > 0) {
                    if (isNullOrUndefined(localControl[bestmatch[1]]))
                        localControl[bestmatch[1]] = [[path, bestmatch[1], ctis]]
                    else
                        localControl[bestmatch[1]].push([path, bestmatch[1], ctis])
                }
            }
        })

        if (this.cardmode == 'manual') {
            Object.keys(this.categories).forEach((key) => {
                let n = this.categories[key]['count']
                while (n > 0) {
                    if (isNullOrUndefined(localControl[key])) {
                        console.warn(`Could not add ${n} cards of category '${this.categories[key].name}', none were found.`)
                        break
                    }
                    let i = Math.floor(Math.random() * localControl[key].length)
                    let card
                    if (localControl[key].length >= n)
                        card = localControl[key].splice(i, 1)[0]
                    else
                        card = localControl[key][i]
                    this.localCards.push(card)
                    n--
                }
            })
        }
    }
}