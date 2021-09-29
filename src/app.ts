//Drag & Drop Interfaces
interface Draggable {
  dragStartHandler(event: DragEvent): void;
  dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
  dragOverHandler(event: DragEvent): void;
  dropHandler(event: DragEvent): void;
  dragLeaveHandler(event: DragEvent): void;
}

// Project Type
enum GroupOfItems {
  Camping,
  Town,
  Food,
  Misc,
  Uncategorized,
}
class Item {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public weight: number,
    public groupOfItems: GroupOfItems
  ) {}
}

// Project State Management
type Listener<T> = (items: T[]) => void;

class State<T> {
  protected listeners: Listener<T>[] = [];

  addListener(listenerFn: Listener<T>) {
    this.listeners.push(listenerFn);
  }
}

class ProjectState extends State<Item> {
  private items: Item[] = [];
  private static instance: ProjectState;

  private constructor() {
    super();
  }

  static getInstance() {
    if (this.instance) {
      return this.instance;
    }
    this.instance = new ProjectState();
    return this.instance;
  }

  addItem(name: string, description: string, weight: number) {
    const newItem = new Item(
      Math.random().toString(),
      name,
      description,
      weight,
      GroupOfItems.Uncategorized
    );
    this.items.push(newItem);
    this.updateListeners();
  }

  moveProject(itemId: string, newGroup: GroupOfItems) {
    const item = this.items.find((itm) => itm.id === itemId);
    if (item && item.groupOfItems !== newGroup) {
      item.groupOfItems = newGroup;
      this.updateListeners();
    }
  }

  private updateListeners() {
    for (const listenerFn of this.listeners) {
      listenerFn(this.items.slice());
    }
  }
}

const projectState = ProjectState.getInstance();

// Validation
interface Validatable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

function validate(validatableInput: Validatable) {
  let isValid = true;
  if (validatableInput.required) {
    isValid = isValid && validatableInput.value.toString().trim().length !== 0;
  }
  if (
    validatableInput.minLength != null && // != checks for undefined and null with the single "="
    typeof validatableInput.value === "string"
  ) {
    isValid =
      isValid && validatableInput.value.length >= validatableInput.minLength;
  }
  if (
    validatableInput.maxLength != null && // != checks for undefined and null with the single "="
    typeof validatableInput.value === "string"
  ) {
    isValid =
      isValid && validatableInput.value.length <= validatableInput.maxLength;
  }
  if (
    validatableInput.min != null &&
    typeof validatableInput.value === "number"
  ) {
    isValid = isValid && validatableInput.value >= validatableInput.min;
  }
  if (
    validatableInput.max != null &&
    typeof validatableInput.value === "number"
  ) {
    isValid = isValid && validatableInput.value <= validatableInput.max;
  }

  return isValid;
}

// autobind decorator
function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const adjDesciptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundFn = originalMethod.bind(this);
      return boundFn;
    },
  };
  return adjDesciptor;
}

//Component Base Class
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  hostElement: T;
  element: U;

  constructor(
    templateId: string,
    hostElementId: string,
    insertAtStart: boolean,
    newElementId?: string
  ) {
    this.templateElement = document.getElementById(
      templateId
    )! as HTMLTemplateElement;
    this.hostElement = document.getElementById(hostElementId)! as T;

    const importedNode = document.importNode(
      this.templateElement.content,
      true
    );
    this.element = importedNode.firstElementChild as U;
    if (newElementId) {
      this.element.id = newElementId;
    }
    this.attach(insertAtStart);
  }
  private attach(insertAtBeginning: boolean) {
    this.hostElement.insertAdjacentElement(
      insertAtBeginning ? "afterbegin" : "beforeend",
      this.element
    );
  }

  abstract configure(): void;
  abstract renderContent(): void;
}

//ProjectItem Class
class ProjectItem
  extends Component<HTMLUListElement, HTMLLIElement>
  implements Draggable
{
  private item: Item;

  get weight() {
    if (this.item.weight === 1) {
      return "1 gram";
    } else {
      return `${this.item.weight} grams`;
    }
  }

  constructor(hostId: string, item: Item) {
    super("single-item", hostId, false, item.id);
    this.item = item;

    this.configure();
    this.renderContent();
  }
  @autobind
  dragStartHandler(event: DragEvent) {
    event.dataTransfer!.setData("text/plain", this.item.id);
    event.dataTransfer!.effectAllowed = "move";
  }

  @autobind
  dragEndHandler(_: DragEvent) {
    console.log("DragEnd");
  }

  configure() {
    this.element.addEventListener("dragstart", this.dragStartHandler);
    this.element.addEventListener("dragend", this.dragEndHandler);
  }

  renderContent() {
    this.element.querySelector("h2")!.textContent = this.item.name;
    this.element.querySelector("h3")!.textContent = "Weight: " + this.weight;
    this.element.querySelector("p")!.textContent = this.item.description;
  }
}

// ProjectGroup Class
class ProjectGroup
  extends Component<HTMLDivElement, HTMLElement>
  implements DragTarget
{
  assignedItems: Item[];

  constructor(
    private group:
      | GroupOfItems.Camping
      | GroupOfItems.Town
      | GroupOfItems.Food
      | GroupOfItems.Misc
      | GroupOfItems.Uncategorized
  ) {
    super("packing-list", "app", false, `${group}-group`);
    this.assignedItems = [];
    this.configure();
    this.renderContent();
  }

  @autobind
  dragOverHandler(event: DragEvent) {
    if (event.dataTransfer && event.dataTransfer.types[0] === "text/plain") {
      event.preventDefault(); //Tells JS that this element can allow dropping since the default is to prevent dropping
      const listEl = this.element.querySelector("ul")!;
      listEl.classList.add("droppable");
    }
  }

  

  @autobind
  dropHandler(event: DragEvent) {
    const itmId = event.dataTransfer!.getData("text/plain");
    projectState.moveProject(
      itmId,
      this.group === GroupOfItems.Uncategorized
        ? GroupOfItems.Uncategorized
        : GroupOfItems.Camping
    );
  }

  @autobind
  dragLeaveHandler(_: DragEvent) {
    const listEl = this.element.querySelector("ul")!;
    listEl.classList.remove("droppable");
  }

  configure() {
    this.element.addEventListener("dragover", this.dragOverHandler);
    this.element.addEventListener("dragleave", this.dragLeaveHandler);
    this.element.addEventListener("drop", this.dropHandler);

    projectState.addListener((items: Item[]) => {
      const relevantitems = items.filter((itm) => {
        if (this.group === GroupOfItems.Uncategorized) {
          return itm.groupOfItems === GroupOfItems.Uncategorized;
        }
        return itm.groupOfItems === GroupOfItems.Camping;
      });
      this.assignedItems = relevantitems;
      this.renderProjects();
    });
  }

  renderContent() {
    const listId = `${this.group}-packing-list`;
    this.element.querySelector("ul")!.id = listId; //TODO: What is this?
    this.element.querySelector("h2")!.textContent =
      GroupOfItems[this.group].toUpperCase() + " ITEMS";
  }

  private renderProjects() {
    const listEl = document.getElementById(
      `${this.group}-packing-list`
    )! as HTMLUListElement;
    listEl.innerHTML = "";
    for (const singleItem of this.assignedItems) {
      new ProjectItem(this.element.querySelector("ul")!.id, singleItem);
    }
  }
}

// ProjectInput Class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  nameInputElement: HTMLInputElement;
  descriptionInputElement: HTMLInputElement;
  weightInputElement: HTMLInputElement;

  constructor() {
    super("item-input", "app", true, "user-input");
    this.nameInputElement = this.element.querySelector(
      "#name"
    ) as HTMLInputElement;
    this.descriptionInputElement = this.element.querySelector(
      "#description"
    ) as HTMLInputElement;
    this.weightInputElement = this.element.querySelector(
      "#weight"
    ) as HTMLInputElement;

    this.configure();
  }

  configure() {
    this.element.addEventListener("submit", this.submitHandler); //TODO: What is submit?
  }

  renderContent() {}

  private gatherUserInput(): [string, string, number] | void {
    const enteredName = this.nameInputElement.value;
    const enteredDescription = this.descriptionInputElement.value;
    const enteredWeight = this.weightInputElement.value;

    const nameValidatable: Validatable = {
      value: enteredName,
      required: true,
    };
    const desciptionValidatable: Validatable = {
      value: enteredDescription,
      required: true,
      minLength: 5,
    };
    const weightValidatable: Validatable = {
      value: +enteredWeight,
      required: true,
      min: 1,
      max: 1000,
    };

    if (
      !validate(nameValidatable) ||
      !validate(desciptionValidatable) ||
      !validate(weightValidatable)
    ) {
      alert("Invalid input, please try again!");
      return;
    } else {
      return [enteredName, enteredDescription, +enteredWeight];
    }
  }

  private clearInputs() {
    this.nameInputElement.value = "";
    this.descriptionInputElement.value = "";
    this.weightInputElement.value = "";
  }

  @autobind
  private submitHandler(event: Event) {
    event.preventDefault();
    const userInput = this.gatherUserInput();
    if (Array.isArray(userInput)) {
      const [name, desc, weight] = userInput;
      projectState.addItem(name, desc, weight);
      this.clearInputs();
    }
  }
}

const prjInput = new ProjectInput();
const campingItmList = new ProjectGroup(GroupOfItems.Camping);
const foodItmList = new ProjectGroup(GroupOfItems.Food);
const miscItmList = new ProjectGroup(GroupOfItems.Misc);
const townItmList = new ProjectGroup(GroupOfItems.Town);
const uncatItmList = new ProjectGroup(GroupOfItems.Uncategorized);
