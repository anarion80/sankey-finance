export const nodesSchema = {
    name: {
        prop: 'name',
        type: String,
        required: true
    },
    type: {
        prop: 'type',
        type: String,
        required: true
    },
    color: {
        prop: 'color',
        type: String
    }
}

export const linksSchema = {
    source: {
        prop: 'source',
        type: String,
        required: true
    },
    target: {
        prop: 'target',
        type: String,
        required: true
    },
    value: {
        prop: 'value',
        type: Number,
        required: true
    },
    color: {
        prop: 'color',
        type: String
    }
}

export const metadataSchema = {
    header: {
        prop: 'header',
        type: String
    },
    currency: {
        prop: 'currency',
        type: String
    },
    abbreviation: {
        prop: 'abbreviation',
        type: String
    }
}
