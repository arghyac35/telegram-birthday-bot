export interface IBirthday {
  _id: string,
  birthDate: Date,
  tgUserId: number,
  tgChatId: number
}

export interface IBirthdayInputDTO {
  birthDate: Date,
  tgUserId: number,
  tgChatId: number
}
