export class CreateCheckoutDto {
    courseId: string;
    courseTitle: string;
    price: number;
    quantity: number;
    customerEmail: string;
    selectedDate?: string;
    successUrl: string;
    cancelUrl: string;
}