export const nodesSchema = {
    name: {
        column: "name",
        type: String,
        required: true,
    },
    type: {
        column: "type",
        type: String,
        required: true,
    },
    color: {
        column: "color",
        type: String,
    },
};

export const linksSchema = {
    source: {
        column: "source",
        type: String,
        required: true,
    },
    target: {
        column: "target",
        type: String,
        required: true,
    },
    value: {
        column: "value",
        type: Number,
        required: true,
    },
    color: {
        column: "color",
        type: String,
    },
};

export const metadataSchema = {
    header: {
        column: "header",
        type: String,
    },
    currency: {
        column: "currency",
        type: String,
    },
    abbreviation: {
        column: "abbreviation",
        type: String,
    },
};
