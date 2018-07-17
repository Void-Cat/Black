class ImageController {
    public cardratio: number
    public cards : Card[] = []
    categories: object
    public cil = {}
    public images : string[] = []
    index = -1
    length = 0
    localCards: any[][] = []
    localImages: string[] = []
    localUsedCards: any[][] = []
    localUsedImages: string[] = []
    public unending = false
    
    constructor(startingIndex = -1, unending = false) {
        if (startingIndex <= 1) startingIndex = -1
        this.index = startingIndex
        this.unending = unending
        this.categories = storage.get('tease.categories')
        this.findCards()
        this.localImages = this.findImages()
        this.cardratio = storage.get('settings.cardratio') / 100
        let startlength = storage.get('tease.setup.imagecount') * (1 + storage.get('settings.cardratio'))
        this.extend(startlength)
    }

    public extend(n?: number) : void {
        if (isNullOrUndefined(n))
            n = this.length + 50

        while (this.length < n) {
            // Card or image
            if (Math.random() < this.cardratio) {
                let card = this.getCard()
                let index = this.images.length
                this.images.push(card[0])
                if (isNullOrUndefined(card[2]))
                    this.cil[index] = [card[1], null]
                else {
                    this.cil[index] = [card[1], this.cards.length]
                    this.cards.push(new Card(card[2], index))
                }
            } else {
                this.images.push(this.getImage())
            }
            this.length++
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

        let raw = this.findImages(folder, true)
        raw.forEach((path) => {
            // Find the category for the card
            let bestmatch = [0, null]
            Object.keys(this.categories).forEach((key) => {
                let name = this.categories[key].name.toLowerCase()
                let match = path.toLowerCase().lastIndexOf(name)
                if (match > bestmatch[0])
                    bestmatch = [match, name]
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
            if (fs.existsSync(ctispath))
                ctis = JSON.parse(fs.readFileSync(ctispath))
            
            // Add the card
            this.localCards.push([path, bestmatch[0], ctis])
        })
    }
}