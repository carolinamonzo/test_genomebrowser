table sqantiDecorators
"SQANTI3 transcript decorations for junctions and quality features"
(
    string  chrom;              "Chromosome"
    uint    chromStart;         "Start position"
    uint    chromEnd;           "End position"
    string  name;               "Decorator identifier"
    uint    score;              "Priority score (0-1000, higher=more important)"
    char[1] strand;             "+ or - strand"
    uint    thickStart;         "Visual start position"
    uint    thickEnd;           "Visual end position"
    uint    itemRgb;            "RGB color value"
    string  annotType;          "Annotation type: junction, artifact, validation, prediction"
    string  category;           "Specific category: novel, RT_switch, non_canonical, etc."
    string  description;        "Human-readable description"
    string  featType;           "Feature type: splice_junction, TSS, TTS, NMD_trigger"
    string  confidence;         "Confidence level: high, medium, low"
    string  supportingData;     "Supporting evidence in key:value format"
)
