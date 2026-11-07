package br.com.restaurantmanager.catalogo.converters;

import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

public class TextoMonetarioDeserializer extends ValueDeserializer<String> {
    @Override
    public String deserialize(JsonParser parser, DeserializationContext contexto) {
        if (!parser.hasToken(JsonToken.VALUE_STRING)) {
            return (String) contexto.handleUnexpectedToken(String.class, parser);
        }
        return parser.getString();
    }
}
