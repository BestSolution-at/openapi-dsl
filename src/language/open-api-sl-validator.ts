//import type { ValidationAcceptor, ValidationChecks } from 'langium';
//import type { OpenApiSlAstType } from './generated/ast.js';
import type { OpenApiSlServices } from './open-api-sl-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: OpenApiSlServices) {
    /*const registry = services.validation.ValidationRegistry;
    const validator = services.validation.OpenApiSlValidator;
    const checks: ValidationChecks<OpenApiSlAstType> = {
        Person: validator.checkPersonStartsWithCapital
    };
    registry.register(checks, validator);*/
}

export class OpenApiSlValidator {

    /*checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
        if (person.name) {
            const firstChar = person.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
            }
        }
    }*/

}
