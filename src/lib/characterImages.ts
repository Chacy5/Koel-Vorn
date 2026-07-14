import registry from '../data/character-images.json';

interface CharacterImageInput {
  slug: string;
  image?: string;
}

const images = new Map(registry.map((item) => [item.id, item.image]));

export const resolveCharacterImage = (character: CharacterImageInput) => images.get(character.slug) ?? character.image;
