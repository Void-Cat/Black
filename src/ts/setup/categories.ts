class CategoryControl {
    categories = {}
    elements = {}
    skipped : number[] = []
    public length: number = 0

    public add(name: string, element = true, count?: number, ratio?: number) : boolean {
        if (this.skipped.length > 0)
            var id = this.skipped.shift()
        else
            var id = Object.keys(this.categories).length
        this.categories[id] = {
            count: count || 0,
            name: name,
            ratio: ratio || 0,
        }
        this.length++
        if (element)
            return this.createElement(id, name, count, ratio)
        return true
    }

    public clear(confirm = false) {
        if (confirm) {
            Object.keys(this.categories).forEach((id: any) => {
                this.remove(id)
            })
        }
    }

    constructor(load = true) {
        if (load) {
            let cats = storage.get('tease.categories')
            if (isObject(cats))
                Object.keys(cats).forEach((id: any) => {
                    let cat = cats[id]
                    this.add(cat.name, true, cat.count, cat.ratio)
                })
        }
    }

    createElement(id: number, name: string, count?: number, ratio?: number) : boolean {
        if (isNullOrUndefined(count)) count = 0
        if (isNullOrUndefined(ratio)) ratio = 0
        this.elements[id] = {
            count: this._createElement(id, name, count, 'count'),
            ratio: this._createElement(id, name, ratio, 'ratio')
        }
        $('#cardMode-manual-list').append(this.elements[id].count)
        $('#cardMode-percentage-list').append(this.elements[id].ratio)
        $(`input[name="category-${id}-name"]`).on('change', (event) => {
            this.rename(id, $(event.currentTarget).val().toString())
        })
        $(`input[name="category-${id}-count"]`).on('change', (event) => {
            this.categories[id].count = parseInt($(`input[name="category-${id}-count"]`).val().toString(), 10)
            this.toRatio(id)
        })
        $(`input[name="category-${id}-ratio"]`).on('change', (event) => {
            this.categories[id].ratio = parseInt($(`input[name="category-${id}-ratio"]`).val().toString(), 10)
        })
        $(`i[name="category-${id}-remove"]`).on('click', () => {
            this.remove(id)
            $(`div[name="category-${id}"]`).remove()
        })
        mdc.textField.MDCTextField.attachTo($(this.elements[id].count).children('.mdc-text-field')[0])
        mdc.textField.MDCTextField.attachTo($(this.elements[id].count).children('.mdc-text-field')[1])
        mdc.textField.MDCTextField.attachTo($(this.elements[id].ratio).children('.mdc-text-field')[0])
        mdc.textField.MDCTextField.attachTo($(this.elements[id].ratio).children('.mdc-text-field')[1])
        return true
    }

    _createElement(id: number, name: string, numerical: number, type: string) : JQuery<HTMLElement> {
        let baseElement = `
        <div name="category-${id}" class="mdc-list-item">
            <div class="mdc-text-field">
                <input name="category-${id}-name" value="${name}" type="text" class="mdc-text-field__input" />
                <label class="mdc-floating-label" for="category-${id}-name">Category Name</label>
                <div class="mdc-line-ripple"></div>
            </div>
            &nbsp;
            <div class="mdc-text-field">
                <input name="category-${id}-${type}" value="${numerical}" type="number" min="0" class="mdc-text-field__input" />
                <label class="mdc-floating-label" for="category-${id}-${type}">Category ${type[0].toUpperCase()}${type.substring(1)}</label>
                <div class="mdc-line-ripple"></div>
            </div>
            <i name="category-${id}-remove" class="material-icons" style="float: right; cursor: pointer;">delete</i>
        </div>`
        return $(baseElement).clone()
    }

    public remove(id: number) : boolean {
        if (isNullOrUndefined(this.categories[id]))
            return false;
        delete this.categories[id]
        $(this.elements[id].count).off().remove()
        $(this.elements[id].ratio).off().remove()
        delete this.elements[id]
        this.skipped.push(id)
        this.length--
        return true;
    }

    public rename(id: number, newName: string) : boolean {
        this.categories[id].name = newName
        return true
    }

    public save() : void {
        this.retrieveAll()
        if ($('#cardModeSelection').val() == 'manual')
            this.toRatio()
        storage.set('tease.categories', this.categories)
    }

    public update(id?: number, count?: number, ratio?: number) : boolean {
        if (isNullOrUndefined(id)) {
            this.retrieveAll()
            return true;
        }
        if (isNullOrUndefined(this.categories[id]) || (isNullOrUndefined(count) && isNullOrUndefined(ratio)))
            return false;
        if (!isNullOrUndefined(count))
            this.categories[id].count = count
        if (!isNullOrUndefined(ratio))
            this.categories[id].ratio = ratio
        return true;
    }

    toRatio(id?: number) {
        let total = 0
        Object.keys(this.categories).forEach((key) => {
            total += this.categories[key].count
        })
        if (isNullOrUndefined(id))
            Object.keys(this.categories).forEach((key) => {
                this.categories[key].ratio = Math.round(this.categories[key].count / total)
                $(this.elements[key].ratio).val(this.categories[key].ratio)
            })
        else {
            this.categories[id].ratio = Math.round(this.categories[id].count / total)
            $(this.elements[id].ratio).val(this.categories[id].ratio)
        }
    }

    public retrieveAll() : void {
        Object.keys(this.elements).forEach((category : any) => {
            this.update(
                category,
                parseInt($(`input[name="category-${category}-count"]`).val().toString(), 10),
                parseInt($(`input[name="category-${category}-ratio"]`).val().toString(), 10)
            )
        })
    }
}