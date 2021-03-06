import { Component, ViewChild, OnInit, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort, MatTable } from '@angular/material';
import { AuthService } from 'src/app/services/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PcsUtil } from 'src/app/services/pcs-util.service';
//Model
import { Variavel } from 'src/app/model/variaveis';
import { VariaveisOpcoes } from 'src/app/model/variaveis-opcoes';
import { VariavelResposta } from 'src/app/model/variaveis-resposta';
import { VariavelReferencia } from 'src/app/model/variaveis-referencia';
import { VariavelService } from 'src/app/services/variavel.service';
import { Alert } from 'selenium-webdriver';
import { Perfil } from 'src/app/model/perfil';

export interface DropDownList {
  value: number;
  viewValue: string;
}

@Component({
  selector: 'app-variaveis',
  templateUrl: './variaveis.component.html',
  styleUrls: ['./variaveis.component.css']
})
export class VariavelComponent implements OnInit {
  displayedColumns: string[] = ['Descricao', 'Valor', '#Remover'];
  dataSource = new MatTableDataSource();
  loading: any;
  tipoVariavelSelecionado: number;
  unidadeMedidaSelecionado: number;
  exibirPainel: number;
  labelVarBasica: string;
  labelPermImportacao: string;
  labelMultiplaSelecao: string;
  formularioValido: boolean;
  desabilitarOpcaoReferencia: boolean = false;

  // Variaveis DropdownList
  listaTipoVariavel: DropDownList[];
  listaTipoVariavelPrefeitura: DropDownList[];
  listaUnidadeMedida: DropDownList[];

  // Variaveis Lista
  listaTabelaSimOpcoes = new Array<VariaveisOpcoes>();
  listaTabelaNaoOpcoes = new Array<VariaveisOpcoes>();
  listaTabelaOpcoes = new Array<VariaveisOpcoes>();
  listaTodasOpcoes = new Array<VariaveisOpcoes>();

  // Variaveis DataSource
  dataSourceSimOpcoes = new MatTableDataSource();
  dataSourceNaoOpcoes = new MatTableDataSource();
  dataSourceOpcoes = new MatTableDataSource();

  // Variaveis Formulario
  formVariaveis: FormGroup;
  formSimNaoOpcoes: FormGroup;
  formSimNao: FormGroup;
  formOpcoes: FormGroup;
  formReferencia: FormGroup;

  // Variaveis Objeto
  objetoSimNaoOpcoes: VariaveisOpcoes = new VariaveisOpcoes();
  variavelSelecionado: Variavel;

  // Variaveis Checkbox
  chkOpcaoSim: boolean;
  chkOpcaoNao: boolean;
  chkOpcaoReferencia: boolean;

  // Variaveis de exibi????o das tabelas ou referencia
  exibirTbSimOpcoes: boolean;
  exibirTbNaoOpcoes: boolean;
  exibirReferencia: boolean;

  @ViewChildren(MatPaginator) paginator = new QueryList<MatPaginator>();
  @ViewChildren(MatSort) sort = new QueryList<MatSort>();
  @ViewChild(MatPaginator) paginatorAll: MatPaginator;
  scrollUp: any;

  constructor(public authService: AuthService, public formBuilder: FormBuilder, public router: Router,
              private element: ElementRef,public activatedRoute: ActivatedRoute, public variavelService: VariavelService) {
    this.scrollUp = this.router.events.subscribe((path) => {
      element.nativeElement.scrollIntoView();
    });
    this.formVariaveis = this.formBuilder.group({
      id: [''],
      nome: ['', [Validators.minLength(5), Validators.maxLength(500), Validators.required]],
      descricao: ['', [Validators.minLength(5), Validators.maxLength(500), Validators.required]],
      tipoVariavel: ['', [Validators.required]],
      unidadeMedida: [''],
      varBasica: [false],
      permImportacao: [false],
      multiplaSelecao: [false],
    });

    this.formSimNaoOpcoes = this.formBuilder.group({
      respostaSimOpcao: ['', [Validators.maxLength(20), Validators.required]],
      respostaNaoOpcao: ['', [Validators.maxLength(20), Validators.required]],
      opcaoSim: [''],
      valorOpcaoSim: [''],
      opcaoNao: [''],
      valorOpcaoNao: ['']
    });

    this.formSimNao = this.formBuilder.group({
      respostaSim: ['', [Validators.maxLength(20), Validators.required]],
      respostaNao: ['', [Validators.maxLength(20), Validators.required]]
    });

    this.formOpcoes = this.formBuilder.group({
      opcao: [''],
      valorOpcao: ['']
    });

    this.formReferencia = this.formBuilder.group({
      deGreen: ['', [Validators.maxLength(20), Validators.required]],
      ateGreen: ['', [Validators.maxLength(20), Validators.required]],
      deYellow: ['', [Validators.maxLength(20), Validators.required]],
      ateYellow: ['', [Validators.maxLength(20), Validators.required]],
      deOrange: ['', [Validators.maxLength(20), Validators.required]],
      ateOrange: ['', [Validators.maxLength(20), Validators.required]],
      deRed: ['', [Validators.maxLength(20), Validators.required]],
      ateRed: ['', [Validators.maxLength(20), Validators.required]],
      referencia: ['', [Validators.maxLength(100), Validators.required]],
    });
  }

  async ngOnInit() {
    this.loading = true;
    this.variavelSelecionado = new Variavel();
    this.DisableOpcaoReferencia();
    await this.carregarDados();
    this.paginatorAll._intl.itemsPerPageLabel = "Itens por p??gina";
    this.paginatorAll._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; }
    await this.buscarVariavel();
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  DisableOpcaoReferencia() {
    let usuarioLogadoCredencial = JSON.parse(localStorage.getItem('usuarioLogado'));
    this.desabilitarOpcaoReferencia = usuarioLogadoCredencial.usuarioPrefeitura === true ? true : false;
  }

  async buscarVariavel() {
    await this.activatedRoute.params.subscribe(async params => {
      let id = params.id;
      let tabelaSimTemItem: boolean = false;
      let tabelaNaoTemItem: boolean = false;
      this.variavelSelecionado = new Variavel();

      if (id) {
        await this.variavelService.buscarVariavelId(id).subscribe(async response => {
          const tipoVariavel = this.listaTipoVariavel.filter(x => x.viewValue === response.tipo)[0];
          const unidadeMedida = this.listaUnidadeMedida.filter(x => x.viewValue === response.unidade)[0];

          this.formVariaveis.controls['nome'].setValue(response.nome);
          this.formVariaveis.controls['descricao'].setValue(response.descricao);
          this.formVariaveis.controls['tipoVariavel'].setValue(tipoVariavel != null && tipoVariavel !== undefined ? tipoVariavel.value : null);
          this.formVariaveis.controls['unidadeMedida'].setValue(unidadeMedida != null && unidadeMedida !== undefined ? unidadeMedida.value : null);
          this.formVariaveis.controls['varBasica'].setValue(response.variavelBasica);
          this.formVariaveis.controls['permImportacao'].setValue(response.permiteImportacao);
          this.formVariaveis.controls['multiplaSelecao'].setValue(response.multiplaSelecao);
          this.labelVarBasica = response.variavelBasica === true ? "Sim" : "N??o";
          this.labelPermImportacao = response.permiteImportacao === true ? "Sim" : "N??o";
          this.labelMultiplaSelecao = response.multiplaSelecao === true ? "Sim" : "N??o";

          // Valida????o para o Tipo Sim/N??o com lista de op????es
          if (this.formVariaveis.controls['tipoVariavel'].value === 1) {
            this.formSimNaoOpcoes.controls['respostaSimOpcao'].setValue(response.variavelResposta.respostaSim);
            this.formSimNaoOpcoes.controls['respostaNaoOpcao'].setValue(response.variavelResposta.respostaNao);
            for (const ItemOpcao of response.variavelResposta.listaOpcoes) {
              if (ItemOpcao.tipo.toUpperCase() === 'SIM') {
                this.objetoSimNaoOpcoes = new VariaveisOpcoes();
                this.objetoSimNaoOpcoes.id = ItemOpcao.id;
                this.objetoSimNaoOpcoes.descricao = ItemOpcao.descricao;
                this.objetoSimNaoOpcoes.tipo = ItemOpcao.tipo;
                this.objetoSimNaoOpcoes.valor = ItemOpcao.valor;
                this.listaTabelaSimOpcoes.push(this.objetoSimNaoOpcoes);
                this.listaTodasOpcoes.push(this.objetoSimNaoOpcoes);
                this.dataSourceSimOpcoes = new MatTableDataSource(this.listaTabelaSimOpcoes);
                this.paginator.toArray()[0]._intl.itemsPerPageLabel = 'Itens por p??gina';
                this.paginator.toArray()[0]._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; }
                this.dataSourceSimOpcoes.paginator = this.paginator.toArray()[0];
                this.dataSourceSimOpcoes.sort = this.sort.toArray()[0];
                this.paginator.toArray()[0]._intl.firstPageLabel = 'Primeira p??gina';
                this.paginator.toArray()[0]._intl.previousPageLabel = 'P??gina anterior';
                this.paginator.toArray()[0]._intl.nextPageLabel = 'Pr??xima p??gina';
                this.paginator.toArray()[0]._intl.lastPageLabel = '??ltima p??gina';
                tabelaSimTemItem = true;
              }
              else if (ItemOpcao.tipo.toUpperCase() === 'NAO') {
                this.objetoSimNaoOpcoes = new VariaveisOpcoes();
                this.objetoSimNaoOpcoes.id = ItemOpcao.id;
                this.objetoSimNaoOpcoes.descricao = ItemOpcao.descricao;
                this.objetoSimNaoOpcoes.tipo = ItemOpcao.tipo;
                this.objetoSimNaoOpcoes.valor = ItemOpcao.valor;
                this.listaTabelaNaoOpcoes.push(this.objetoSimNaoOpcoes);
                this.listaTodasOpcoes.push(this.objetoSimNaoOpcoes);
                this.dataSourceNaoOpcoes = new MatTableDataSource(this.listaTabelaNaoOpcoes);
                this.paginator.toArray()[1]._intl.itemsPerPageLabel = 'Itens por p??gina';
                this.paginator.toArray()[1]._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; }
                this.dataSourceNaoOpcoes.paginator = this.paginator.toArray()[1];
                this.dataSourceNaoOpcoes.sort = this.sort.toArray()[1];
                this.paginator.toArray()[1]._intl.firstPageLabel = 'Primeira p??gina';
                this.paginator.toArray()[1]._intl.previousPageLabel = 'P??gina anterior';
                this.paginator.toArray()[1]._intl.nextPageLabel = 'Pr??xima p??gina';
                this.paginator.toArray()[1]._intl.lastPageLabel = '??ltima p??gina';
                tabelaNaoTemItem = true;
              }
            }

            this.chkOpcaoSim = tabelaSimTemItem;
            this.exibirTbSimOpcoes = tabelaSimTemItem;
            this.chkOpcaoNao = tabelaNaoTemItem;
            this.exibirTbNaoOpcoes = tabelaNaoTemItem;
            this.exibirPainel = 1;
          }

          // Valida????o para o Tipo Sim/N??o
          if (this.formVariaveis.controls['tipoVariavel'].value === 2) {
            this.formSimNao.controls['respostaSim'].setValue(response.variavelResposta.respostaSim);
            this.formSimNao.controls['respostaNao'].setValue(response.variavelResposta.respostaNao);
            this.exibirPainel = 2;
          }

          // Valida????o para o Tipo lista de op????es
          if (this.formVariaveis.controls['tipoVariavel'].value === 3) {
            for (const ItemOpcao of response.variavelResposta.listaOpcoes) {
              if (ItemOpcao.tipo.toUpperCase() === 'OPCAO') {
                this.objetoSimNaoOpcoes = new VariaveisOpcoes();
                this.objetoSimNaoOpcoes.id = ItemOpcao.id;
                this.objetoSimNaoOpcoes.descricao = ItemOpcao.descricao;
                this.objetoSimNaoOpcoes.tipo = ItemOpcao.tipo;
                this.objetoSimNaoOpcoes.valor = ItemOpcao.valor;
                this.listaTabelaOpcoes.push(this.objetoSimNaoOpcoes);
                this.listaTodasOpcoes.push(this.objetoSimNaoOpcoes);
                this.dataSourceOpcoes = new MatTableDataSource(this.listaTabelaOpcoes);
                this.paginator.toArray()[2]._intl.itemsPerPageLabel = 'Itens por p??gina';
                this.paginator.toArray()[2]._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; }
                this.dataSourceOpcoes.paginator = this.paginator.toArray()[2];
                this.dataSourceOpcoes.sort = this.sort.toArray()[2];
                this.paginator.toArray()[2]._intl.firstPageLabel = 'Primeira p??gina';
                this.paginator.toArray()[2]._intl.previousPageLabel = 'P??gina anterior';
                this.paginator.toArray()[2]._intl.nextPageLabel = 'Pr??xima p??gina';
                this.paginator.toArray()[2]._intl.lastPageLabel = '??ltima p??gina';
              }
              this.exibirPainel = 3;
            }
          }

          if (this.desabilitarOpcaoReferencia === false) {
            for (const itemVariavelReferencia of response.variavelReferencia) {
              if (itemVariavelReferencia.cor === '#39FF33') {
                this.formReferencia.controls['deGreen'].setValue(itemVariavelReferencia.valorde);
                this.formReferencia.controls['ateGreen'].setValue(itemVariavelReferencia.valorate);
              }
              else if (itemVariavelReferencia.cor === '#FFFF00') {
                this.formReferencia.controls['deYellow'].setValue(itemVariavelReferencia.valorde);
                this.formReferencia.controls['ateYellow'].setValue(itemVariavelReferencia.valorate);
              }
              else if (itemVariavelReferencia.cor === '#FFA500') {
                this.formReferencia.controls['deOrange'].setValue(itemVariavelReferencia.valorde);
                this.formReferencia.controls['ateOrange'].setValue(itemVariavelReferencia.valorate);
              }
              else if (itemVariavelReferencia.cor === '#FF0000') {
                this.formReferencia.controls['deRed'].setValue(itemVariavelReferencia.valorde);
                this.formReferencia.controls['ateRed'].setValue(itemVariavelReferencia.valorate);
              }

              //Adicionar o texto da referencia
              this.chkOpcaoReferencia = itemVariavelReferencia.fonteReferencia !== null && itemVariavelReferencia.fonteReferencia !== '' ? false : true;
              this.exibirReferencia = itemVariavelReferencia.fonteReferencia !== null && itemVariavelReferencia.fonteReferencia !== '' ? false : true;
              this.formReferencia.controls['referencia'].setValue(itemVariavelReferencia.fonteReferencia);
            }
          }
          else{
            this.chkOpcaoReferencia = true;
            this.exibirReferencia = true;
          }

          this.variavelSelecionado = response;
          this.loading = false;
        }, error => { this.loading = false });
      }
      else {
        await this.setCampos();
        this.loading = false;
      }
    }, error => { this.loading = false });
  }

  carregarDados() {
    this.listaTipoVariavel = new Array<DropDownList>();
    this.listaUnidadeMedida = new Array<DropDownList>();

    if (!this.desabilitarOpcaoReferencia) {
      this.listaTipoVariavel.push({ value: 1, viewValue: 'Tipo sim/n??o com lista de op????es' });
      this.listaTipoVariavel.push({ value: 2, viewValue: 'Tipo sim/n??o' });
      this.listaTipoVariavel.push({ value: 3, viewValue: 'Tipo lista de op????es' });
      this.listaTipoVariavel.push({ value: 4, viewValue: 'Num??rico inteiro' });
      this.listaTipoVariavel.push({ value: 5, viewValue: 'Num??rico decimal' });
      this.listaTipoVariavel.push({ value: 6, viewValue: 'Texto livre' });
    } else {
      this.listaTipoVariavel.push({ value: 4, viewValue: 'Num??rico inteiro' });
      this.listaTipoVariavel.push({ value: 6, viewValue: 'Texto livre' });
    }

    this.listaUnidadeMedida.push({ value: 0, viewValue: '' });
    this.listaUnidadeMedida.push({ value: 1, viewValue: 'Dias' });
    this.listaUnidadeMedida.push({ value: 2, viewValue: 'Dias por ano' });
    this.listaUnidadeMedida.push({ value: 3, viewValue: 'Gramas por habitante' });
    this.listaUnidadeMedida.push({ value: 4, viewValue: 'Graus celsius' });
    this.listaUnidadeMedida.push({ value: 5, viewValue: 'Graus celsius/ano' });
    this.listaUnidadeMedida.push({ value: 6, viewValue: 'Habitantes' });
    this.listaUnidadeMedida.push({ value: 7, viewValue: 'Habitantes por imovel' });
    this.listaUnidadeMedida.push({ value: 8, viewValue: 'Habitantes por quil??metro quadrado' });
    this.listaUnidadeMedida.push({ value: 9, viewValue: 'Hectare' });
    this.listaUnidadeMedida.push({ value: 10, viewValue: 'Horas' });
    this.listaUnidadeMedida.push({ value: 11, viewValue: 'Horas por ano' });
    this.listaUnidadeMedida.push({ value: 12, viewValue: 'Horas por dia' });
    this.listaUnidadeMedida.push({ value: 13, viewValue: 'Litros' });
    this.listaUnidadeMedida.push({ value: 14, viewValue: 'Litros por habitante' });
    this.listaUnidadeMedida.push({ value: 15, viewValue: 'Livros por habitantes' });
    this.listaUnidadeMedida.push({ value: 16, viewValue: 'L??men' });
    this.listaUnidadeMedida.push({ value: 17, viewValue: 'Megawatt por hora' });
    this.listaUnidadeMedida.push({ value: 18, viewValue: 'Metro' });
    this.listaUnidadeMedida.push({ value: 19, viewValue: 'Metro c??bico' });
    this.listaUnidadeMedida.push({ value: 20, viewValue: 'Metro c??bico por hora' });
    this.listaUnidadeMedida.push({ value: 21, viewValue: 'Metro c??bico por segundo' });
    this.listaUnidadeMedida.push({ value: 22, viewValue: 'Metro quadrado' });
    this.listaUnidadeMedida.push({ value: 23, viewValue: 'Minutos' });
    this.listaUnidadeMedida.push({ value: 24, viewValue: 'Partes por milh??o' });
    this.listaUnidadeMedida.push({ value: 25, viewValue: 'Percentual' });
    this.listaUnidadeMedida.push({ value: 26, viewValue: 'Pessoas por fam??lia' });
    this.listaUnidadeMedida.push({ value: 27, viewValue: 'Press??o sonora (Decibel)' });
    this.listaUnidadeMedida.push({ value: 28, viewValue: 'Quilograma' });
    this.listaUnidadeMedida.push({ value: 29, viewValue: 'Quilogramas por habitante' });
    this.listaUnidadeMedida.push({ value: 30, viewValue: 'Quil??metro' });
    this.listaUnidadeMedida.push({ value: 31, viewValue: 'Quil??metro quadrado' });
    this.listaUnidadeMedida.push({ value: 32, viewValue: 'Quil??metros por hora' });
    this.listaUnidadeMedida.push({ value: 33, viewValue: 'Quilowats por habitante' });
    this.listaUnidadeMedida.push({ value: 34, viewValue: 'Quilowats por m??s' });
    this.listaUnidadeMedida.push({ value: 35, viewValue: 'Quilowatt-hora por m??s' });
    this.listaUnidadeMedida.push({ value: 36, viewValue: 'Reais' });
    this.listaUnidadeMedida.push({ value: 37, viewValue: 'Reais por ano' });
    this.listaUnidadeMedida.push({ value: 38, viewValue: 'Reais por hora' });
    this.listaUnidadeMedida.push({ value: 39, viewValue: 'Reais por m??s' });
    this.listaUnidadeMedida.push({ value: 40, viewValue: 'Taxa para cem mil habitantes' });
    this.listaUnidadeMedida.push({ value: 41, viewValue: 'Taxa para dez mil habitantes' });
    this.listaUnidadeMedida.push({ value: 42, viewValue: 'Tonelada ' });
    this.listaUnidadeMedida.push({ value: 43, viewValue: 'Toneladas de CO2 equivalente (GEE)' });
    this.listaUnidadeMedida.push({ value: 44, viewValue: 'Toneladas de g??s carb??nico' });
    this.listaUnidadeMedida.push({ value: 45, viewValue: 'Toneladas de g??s carb??nico por habitante' });
    this.listaUnidadeMedida.push({ value: 46, viewValue: 'Toneladas por habitante' });
    this.listaUnidadeMedida.push({ value: 47, viewValue: 'Unidade' });
    this.listaUnidadeMedida.push({ value: 48, viewValue: 'Watts' });
    this.listaUnidadeMedida.push({ value: 49, viewValue: 'Watts por metro quadrado' });

  }

  limparCampos() {
    this.formSimNaoOpcoes.controls['respostaSimOpcao'].setValue('');
    this.formSimNaoOpcoes.controls['respostaNaoOpcao'].setValue('');
    this.formSimNaoOpcoes.controls['opcaoSim'].setValue('');
    this.formSimNaoOpcoes.controls['valorOpcaoSim'].setValue('');
    this.formSimNaoOpcoes.controls['opcaoNao'].setValue('');
    this.formSimNaoOpcoes.controls['valorOpcaoNao'].setValue('');
    this.formSimNao.controls['respostaSim'].setValue('');
    this.formSimNao.controls['respostaNao'].setValue('');
    this.formOpcoes.controls['opcao'].setValue('');
    this.formOpcoes.controls['valorOpcao'].setValue('');
    this.chkOpcaoSim = false;
    this.chkOpcaoNao = false;
    this.chkOpcaoReferencia = false;
    this.exibirTbSimOpcoes = false;
    this.exibirTbNaoOpcoes = false;
    this.exibirReferencia = false;
    this.listaTabelaOpcoes = new Array<VariaveisOpcoes>();
    this.listaTabelaNaoOpcoes = new Array<VariaveisOpcoes>();
    this.listaTabelaSimOpcoes = new Array<VariaveisOpcoes>();
    this.listaTodasOpcoes = new Array<VariaveisOpcoes>();
    this.dataSourceNaoOpcoes = new MatTableDataSource();
    this.dataSourceNaoOpcoes.paginator = this.paginator.toArray()[1];
    this.dataSourceNaoOpcoes.sort = this.sort.toArray()[1];
    this.dataSourceOpcoes = new MatTableDataSource();
    this.dataSourceOpcoes.paginator = this.paginator.toArray()[2];
    this.dataSourceOpcoes.sort = this.sort.toArray()[2];
    this.dataSourceSimOpcoes = new MatTableDataSource();
    this.dataSourceSimOpcoes.paginator = this.paginator.toArray()[0];
    this.dataSourceSimOpcoes.sort = this.sort.toArray()[0];
  }

  setCampos() {
    this.labelVarBasica = "N??o";
    this.labelPermImportacao = "N??o";
    this.labelMultiplaSelecao = "N??o"
    this.formVariaveis.controls['permImportacao'].setValue(false);
    this.formVariaveis.controls['multiplaSelecao'].setValue(false);
    this.formVariaveis.controls['varBasica'].setValue(false);
    this.chkOpcaoSim = false;
    this.chkOpcaoNao = false;
    this.chkOpcaoReferencia = this.desabilitarOpcaoReferencia === true ? true : false;
    this.exibirTbSimOpcoes = false;
    this.exibirTbNaoOpcoes = false;
    this.exibirReferencia = this.desabilitarOpcaoReferencia === true ? true : false;
    this.formReferencia.controls['deGreen'].setValue('');
    this.formReferencia.controls['ateGreen'].setValue('');
    this.formReferencia.controls['deYellow'].setValue('');
    this.formReferencia.controls['ateYellow'].setValue('');
    this.formReferencia.controls['deOrange'].setValue('');
    this.formReferencia.controls['ateOrange'].setValue('');
    this.formReferencia.controls['deRed'].setValue('');
    this.formReferencia.controls['ateRed'].setValue('');
    this.formReferencia.controls['referencia'].setValue('');
    this.variavelSelecionado.id = null;
  }

  showPanel(value) {
    switch (value) {
      case 0:
        this.exibirPainel = 0;
        break;
      case 1:
        this.exibirPainel = 1;
        break;
      case 2:
        this.exibirPainel = 2;
        break;
      case 3:
        this.exibirPainel = 3;
        break;
      default:
        this.exibirPainel = 0;
        break;
    }

    this.limparCampos();
  }

  SlideVarBasica() {
    this.labelVarBasica = this.labelVarBasica === "N??o" ? "Sim" : "N??o";
  }

  SlidePermImportacao() {
    this.labelPermImportacao = this.labelPermImportacao === "N??o" ? "Sim" : "N??o";
  }
  slideMultiplaSelecao() {
    this.labelMultiplaSelecao = this.labelMultiplaSelecao === "N??o" ? "Sim" : "N??o";
  }

  chechboxReferencia(value) {
    if (Boolean(value) === false) {
      this.chkOpcaoReferencia = true;
      this.exibirReferencia = true;
    }
    else {
      this.chkOpcaoReferencia = false;
      this.exibirReferencia = false;
      this.formReferencia.controls['deGreen'].setValue('');
      this.formReferencia.controls['ateGreen'].setValue('');
      this.formReferencia.controls['deYellow'].setValue('');
      this.formReferencia.controls['ateYellow'].setValue('');
      this.formReferencia.controls['deOrange'].setValue('');
      this.formReferencia.controls['ateOrange'].setValue('');
      this.formReferencia.controls['deRed'].setValue('');
      this.formReferencia.controls['ateRed'].setValue('');
      this.formReferencia.controls['referencia'].setValue('');
    }
  }

  checkboxTbOpcaoSim(value) {
    if (Boolean(value) === false) {
      this.chkOpcaoSim = true;
      this.exibirTbSimOpcoes = true;
    }
    else {
      this.chkOpcaoSim = false;
      this.exibirTbSimOpcoes = false;
    }
  }

  checkboxTbOpcaoNao(value) {
    if (Boolean(value) === false) {
      this.chkOpcaoNao = true;
      this.exibirTbNaoOpcoes = true;
    }
    else {
      this.chkOpcaoNao = false;
      this.exibirTbNaoOpcoes = false;
    }
  }

  removeTableItemSim(rowTable: VariaveisOpcoes) {
    const rowIndex: number = this.listaTabelaSimOpcoes.indexOf(rowTable);
    if (rowIndex !== -1) {
      this.listaTabelaSimOpcoes.splice(rowIndex, 1);
      this.listaTodasOpcoes.splice(rowIndex, 1);
      this.dataSourceSimOpcoes = new MatTableDataSource(this.listaTabelaSimOpcoes);
      this.paginator.toArray()[0]._intl.itemsPerPageLabel = 'Itens por p??gina';
      this.paginator.toArray()[0]._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; }
      this.dataSourceSimOpcoes.paginator = this.paginator.toArray()[0];
      this.dataSourceSimOpcoes.sort = this.sort.toArray()[0];
      this.paginator.toArray()[0]._intl.firstPageLabel = 'Primeira p??gina';
      this.paginator.toArray()[0]._intl.previousPageLabel = 'P??gina anterior';
      this.paginator.toArray()[0]._intl.nextPageLabel = 'Pr??xima p??gina';
      this.paginator.toArray()[0]._intl.lastPageLabel = '??ltima p??gina';
    }
  }

  removeTableItemNao(rowTable: VariaveisOpcoes) {
    const rowIndex: number = this.listaTabelaNaoOpcoes.indexOf(rowTable);
    if (rowIndex !== -1) {
      this.listaTabelaNaoOpcoes.splice(rowIndex, 1);
      this.listaTodasOpcoes.splice(rowIndex, 1);
      this.dataSourceNaoOpcoes = new MatTableDataSource(this.listaTabelaNaoOpcoes);
      this.paginator.toArray()[1]._intl.itemsPerPageLabel = 'Itens por p??gina';
      this.paginator.toArray()[1]._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; }
      this.dataSourceNaoOpcoes.paginator = this.paginator.toArray()[1];
      this.dataSourceNaoOpcoes.sort = this.sort.toArray()[1];
      this.paginator.toArray()[1]._intl.firstPageLabel = 'Primeira p??gina';
      this.paginator.toArray()[1]._intl.previousPageLabel = 'P??gina anterior';
      this.paginator.toArray()[1]._intl.nextPageLabel = 'Pr??xima p??gina';
      this.paginator.toArray()[1]._intl.lastPageLabel = '??ltima p??gina';
    }
  }

  removeTableItemOpcao(rowTable: VariaveisOpcoes) {
    const rowIndex: number = this.listaTabelaOpcoes.indexOf(rowTable);
    if (rowIndex !== -1) {
      this.listaTabelaOpcoes.splice(rowIndex, 1);
      this.listaTodasOpcoes.splice(rowIndex, 1);
      this.dataSourceOpcoes = new MatTableDataSource(this.listaTabelaOpcoes);
      this.paginator.toArray()[2]._intl.itemsPerPageLabel = 'Itens por p??gina';
      this.paginator.toArray()[2]._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; }
      this.dataSourceOpcoes.paginator = this.paginator.toArray()[2];
      this.dataSourceOpcoes.sort = this.sort.toArray()[2];
      this.paginator.toArray()[2]._intl.firstPageLabel = 'Primeira p??gina';
      this.paginator.toArray()[2]._intl.previousPageLabel = 'P??gina anterior';
      this.paginator.toArray()[2]._intl.nextPageLabel = 'Pr??xima p??gina';
      this.paginator.toArray()[2]._intl.lastPageLabel = '??ltima p??gina';
    }
  }

  addTableItemSim() {
    if (this.formSimNaoOpcoes.controls['opcaoSim'].value === '' || this.formSimNaoOpcoes.controls['opcaoSim'].value === undefined || this.formSimNaoOpcoes.controls['opcaoSim'].value === null) {
      PcsUtil.swal().fire({
        title: 'Vari??veis',
        text: `Campo op????o n??o pode ser cadastrado em branco, favor preench??-lo`,
        type: 'warning',
        showCancelButton: false,
        confirmButtonText: 'Ok',
      }).then((result) => {
      }, error => { });
    }
    else if (this.listaTabelaSimOpcoes.filter(x => x.descricao.trim().toUpperCase() === this.formSimNaoOpcoes.controls['opcaoSim'].value.trim().toUpperCase()).length > 0) {
      PcsUtil.swal().fire({
        title: 'Vari??veis',
        text: `Op????o ${this.formSimNaoOpcoes.controls['opcaoSim'].value} j?? inserida!`,
        type: 'warning',
        showCancelButton: false,
        confirmButtonText: 'Ok',
      }).then((result) => {
      }, error => { });
    }
    else {
      this.objetoSimNaoOpcoes = new VariaveisOpcoes();
      this.objetoSimNaoOpcoes.id = null;
      this.objetoSimNaoOpcoes.descricao = this.formSimNaoOpcoes.controls['opcaoSim'].value;
      this.objetoSimNaoOpcoes.valor = Number(this.formSimNaoOpcoes.controls['valorOpcaoSim'].value);
      this.objetoSimNaoOpcoes.tipo = "Sim";
      this.listaTabelaSimOpcoes.push(this.objetoSimNaoOpcoes);
      this.listaTodasOpcoes.push(this.objetoSimNaoOpcoes);
      this.dataSourceSimOpcoes = new MatTableDataSource(this.listaTabelaSimOpcoes);
      this.paginator.toArray()[0]._intl.itemsPerPageLabel = 'Itens por p??gina';
      this.paginator.toArray()[0]._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; }
      this.dataSourceSimOpcoes.paginator = this.paginator.toArray()[0];
      this.dataSourceSimOpcoes.sort = this.sort.toArray()[0];
      this.paginator.toArray()[0]._intl.firstPageLabel = 'Primeira p??gina';
      this.paginator.toArray()[0]._intl.previousPageLabel = 'P??gina anterior';
      this.paginator.toArray()[0]._intl.nextPageLabel = 'Pr??xima p??gina';
      this.paginator.toArray()[0]._intl.lastPageLabel = '??ltima p??gina';
    }
  }

  addTableItemNao() {
    if (this.formSimNaoOpcoes.controls['opcaoNao'].value === '' || this.formSimNaoOpcoes.controls['opcaoNao'].value === undefined || this.formSimNaoOpcoes.controls['opcaoNao'].value === null) {
      PcsUtil.swal().fire({
        title: 'Vari??veis',
        text: `Campo op????o n??o pode ser cadastrado em branco, favor preench??-lo.`,
        type: 'warning',
        showCancelButton: false,
        confirmButtonText: 'Ok',
      }).then((result) => {
      }, error => { });
    }
    else if (this.listaTabelaNaoOpcoes.filter(x => x.descricao.trim().toUpperCase() === this.formSimNaoOpcoes.controls['opcaoNao'].value.trim().toUpperCase()).length > 0) {
      PcsUtil.swal().fire({
        title: 'Vari??veis',
        text: `Op????o ${this.formSimNaoOpcoes.controls['opcaoNao'].value} j?? inserida!`,
        type: 'warning',
        showCancelButton: false,
        confirmButtonText: 'Ok',
      }).then((result) => {
      }, error => { });
    }
    else {
      this.objetoSimNaoOpcoes = new VariaveisOpcoes();
      this.objetoSimNaoOpcoes.id = null;
      this.objetoSimNaoOpcoes.descricao = this.formSimNaoOpcoes.controls['opcaoNao'].value;
      this.objetoSimNaoOpcoes.valor = Number(this.formSimNaoOpcoes.controls['valorOpcaoNao'].value);
      this.objetoSimNaoOpcoes.tipo = "Nao";
      this.listaTabelaNaoOpcoes.push(this.objetoSimNaoOpcoes);
      this.listaTodasOpcoes.push(this.objetoSimNaoOpcoes);
      this.dataSourceNaoOpcoes = new MatTableDataSource(this.listaTabelaNaoOpcoes);
      this.paginator.toArray()[1]._intl.itemsPerPageLabel = 'Itens por p??gina';
      this.paginator.toArray()[1]._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; }
      this.dataSourceNaoOpcoes.paginator = this.paginator.toArray()[1];
      this.dataSourceNaoOpcoes.sort = this.sort.toArray()[1];
      this.paginator.toArray()[1]._intl.firstPageLabel = 'Primeira p??gina';
      this.paginator.toArray()[1]._intl.previousPageLabel = 'P??gina anterior';
      this.paginator.toArray()[1]._intl.nextPageLabel = 'Pr??xima p??gina';
      this.paginator.toArray()[1]._intl.lastPageLabel = '??ltima p??gina';
    }
  }

  addTableItemOpcao() {
    if (this.formOpcoes.controls['opcao'].value === '' || this.formOpcoes.controls['opcao'].value === undefined || this.formOpcoes.controls['opcao'].value === null) {
      PcsUtil.swal().fire({
        title: 'Vari??veis',
        text: `Campo op????o n??o pode ser cadastrado em branco, favor preench??-lo.`,
        type: 'warning',
        showCancelButton: false,
        confirmButtonText: 'Ok',
      }).then((result) => {
      }, error => { });
    }
    else if (this.listaTabelaOpcoes.filter(x => x.descricao.trim().toUpperCase() === this.formOpcoes.controls['opcao'].value.trim().toUpperCase()).length > 0) {
      PcsUtil.swal().fire({
        title: 'Vari??veis',
        text: `Op????o ${this.formOpcoes.controls['opcao'].value} j?? inserida`,
        type: 'warning',
        showCancelButton: false,
        confirmButtonText: 'Ok',
      }).then((result) => {
      }, error => { });
    }
    else {
      this.objetoSimNaoOpcoes = new VariaveisOpcoes();
      this.objetoSimNaoOpcoes.id = null;
      this.objetoSimNaoOpcoes.descricao = this.formOpcoes.controls['opcao'].value;
      this.objetoSimNaoOpcoes.valor = Number(this.formOpcoes.controls['valorOpcao'].value);
      this.objetoSimNaoOpcoes.tipo = "Opcao";
      this.listaTabelaOpcoes.push(this.objetoSimNaoOpcoes);
      this.listaTodasOpcoes.push(this.objetoSimNaoOpcoes);
      this.dataSourceOpcoes = new MatTableDataSource(this.listaTabelaOpcoes);
      this.paginator.toArray()[2]._intl.itemsPerPageLabel = 'Itens por p??gina';
      this.paginator.toArray()[2]._intl.getRangeLabel = (page: number, pageSize: number, length: number) => { if (length == 0 || pageSize == 0) { return `0 de ${length}`; } length = Math.max(length, 0); const startIndex = page * pageSize; const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize; return `${startIndex + 1} - ${endIndex} de ${length}`; }
      this.dataSourceOpcoes.paginator = this.paginator.toArray()[2];
      this.dataSourceOpcoes.sort = this.sort.toArray()[2];
      this.paginator.toArray()[2]._intl.firstPageLabel = 'Primeira p??gina';
      this.paginator.toArray()[2]._intl.previousPageLabel = 'P??gina anterior';
      this.paginator.toArray()[2]._intl.nextPageLabel = 'Pr??xima p??gina';
      this.paginator.toArray()[2]._intl.lastPageLabel = '??ltima p??gina';
    }
  }

  async salvar() {

    //Variaveis Objetos
    let variavel: Variavel;
    let variavelResposta: VariavelResposta;
    let variavelReferencia: VariavelReferencia;
    let listaVariavelOpcaoSim: Array<VariaveisOpcoes>;
    let listaVariavelOpcaoNao: Array<VariaveisOpcoes>;
    let listaReferencia: Array<VariavelReferencia>;
    let countCor: number = 1;

    this.loading = true;
    this.validarFormulario();
    if (this.formularioValido === true) {
      // Montagem do objeto
      if (this.variavelSelecionado.variavelReferencia === null || this.variavelSelecionado.variavelReferencia === undefined || this.variavelSelecionado.variavelReferencia.length === 0) {
        listaReferencia = new Array<VariavelReferencia>();
        for (countCor; countCor <= 4; countCor++) {
          variavelReferencia = new VariavelReferencia();
          if (countCor === 1) {
            variavelReferencia.id = null;
            variavelReferencia.valorde = this.chkOpcaoReferencia === false ? this.formReferencia.controls['deGreen'].value : 0;
            variavelReferencia.valorate = this.chkOpcaoReferencia === false ? this.formReferencia.controls['ateGreen'].value : 0;
            variavelReferencia.label = "Alto";
            variavelReferencia.cor = "#39FF33";
            variavelReferencia.fonteReferencia = this.chkOpcaoReferencia === false ? this.formReferencia.controls['referencia'].value : '';
            listaReferencia.push(variavelReferencia);
          }
          else if (countCor === 2) {
            variavelReferencia.id = null;
            variavelReferencia.valorde = this.chkOpcaoReferencia === false ? this.formReferencia.controls['deYellow'].value : 0;
            variavelReferencia.valorate = this.chkOpcaoReferencia === false ? this.formReferencia.controls['ateYellow'].value : 0;
            variavelReferencia.label = "M??dio Alto";
            variavelReferencia.cor = "#FFFF00";
            variavelReferencia.fonteReferencia = this.chkOpcaoReferencia === false ? this.formReferencia.controls['referencia'].value : '';
            listaReferencia.push(variavelReferencia);
          }
          else if (countCor === 3) {
            variavelReferencia.id = null;
            variavelReferencia.valorde = this.chkOpcaoReferencia === false ? this.formReferencia.controls['deOrange'].value : 0;
            variavelReferencia.valorate = this.chkOpcaoReferencia === false ? this.formReferencia.controls['ateOrange'].value : 0;
            variavelReferencia.label = "M??dio Baixo";
            variavelReferencia.cor = "#FFA500";
            variavelReferencia.fonteReferencia = this.chkOpcaoReferencia === false ? this.formReferencia.controls['referencia'].value : '';
            listaReferencia.push(variavelReferencia);
          }
          else if (countCor === 4) {
            variavelReferencia.id = null;
            variavelReferencia.valorde = this.chkOpcaoReferencia === false ? this.formReferencia.controls['deRed'].value : 0;
            variavelReferencia.valorate = this.chkOpcaoReferencia === false ? this.formReferencia.controls['ateRed'].value : 0;
            variavelReferencia.label = "Baixo";
            variavelReferencia.cor = "#FF0000";
            variavelReferencia.fonteReferencia = this.chkOpcaoReferencia === false ? this.formReferencia.controls['referencia'].value : '';
            listaReferencia.push(variavelReferencia);
          }
          this.variavelSelecionado.variavelReferencia = listaReferencia;
        }
      }
      else {
        for (const itemVariavelReferencia of this.variavelSelecionado.variavelReferencia) {
          if (countCor === 1) {
            itemVariavelReferencia.valorde = this.chkOpcaoReferencia === false ? this.formReferencia.controls['deGreen'].value : 0;
            itemVariavelReferencia.valorate = this.chkOpcaoReferencia === false ? this.formReferencia.controls['ateGreen'].value : 0;
            itemVariavelReferencia.label = "Alto";
            itemVariavelReferencia.cor = "#39FF33";
          }
          else if (countCor === 2) {
            itemVariavelReferencia.valorde = this.chkOpcaoReferencia === false ? this.formReferencia.controls['deYellow'].value : 0;
            itemVariavelReferencia.valorate = this.chkOpcaoReferencia === false ? this.formReferencia.controls['ateYellow'].value : 0;
            itemVariavelReferencia.label = "M??dio Alto";
            itemVariavelReferencia.cor = "#FFFF00";
          }

          else if (countCor === 3) {
            itemVariavelReferencia.valorde = this.chkOpcaoReferencia === false ? this.formReferencia.controls['deOrange'].value : 0;
            itemVariavelReferencia.valorate = this.chkOpcaoReferencia === false ? this.formReferencia.controls['ateOrange'].value : 0;
            itemVariavelReferencia.label = "M??dio Baixo";
            itemVariavelReferencia.cor = "#FFA500";
          }

          else if (countCor === 4) {
            itemVariavelReferencia.valorde = this.chkOpcaoReferencia === false ? this.formReferencia.controls['deRed'].value : 0;
            itemVariavelReferencia.valorate = this.chkOpcaoReferencia === false ? this.formReferencia.controls['ateRed'].value : 0;
            itemVariavelReferencia.label = "Baixo";
            itemVariavelReferencia.cor = "#FF0000";
            itemVariavelReferencia.fonteReferencia = this.chkOpcaoReferencia === false ? this.formReferencia.controls['referencia'].value : '';
          }
          countCor++;
        }
      }

      if (this.variavelSelecionado.variavelResposta === null || this.variavelSelecionado.variavelResposta === undefined) {
        variavelResposta = new VariavelResposta();
        variavelResposta.id = null;
        variavelResposta.respostaSim = this.exibirPainel === 1 ? this.formSimNaoOpcoes.controls['respostaSimOpcao'].value :
          this.exibirPainel === 2 ? this.formSimNao.controls['respostaSim'].value : 0;
        variavelResposta.respostaNao = this.exibirPainel === 1 ? this.formSimNaoOpcoes.controls['respostaNaoOpcao'].value :
          this.exibirPainel === 2 ? this.formSimNao.controls['respostaNao'].value : 0;
        variavelResposta.exibirOpcaoNao = this.exibirPainel === 1 ? this.chkOpcaoNao : false;
        variavelResposta.exibirOpcaoSim = this.exibirPainel === 1 ? this.chkOpcaoSim : false;
        variavelResposta.exibirOpcao = this.exibirPainel === 3 ? true : false;
        variavelResposta.listaOpcoes = this.exibirPainel === 1 || this.exibirPainel === 3 ? this.listaTodasOpcoes : null;
        this.variavelSelecionado.variavelResposta = variavelResposta;
      }
      else {
        this.variavelSelecionado.variavelResposta.respostaSim = this.exibirPainel === 1 ? this.formSimNaoOpcoes.controls['respostaSimOpcao'].value :
          this.exibirPainel === 2 ? this.formSimNao.controls['respostaSim'].value : 0;
        this.variavelSelecionado.variavelResposta.respostaNao = this.exibirPainel === 1 ? this.formSimNaoOpcoes.controls['respostaNaoOpcao'].value :
          this.exibirPainel === 2 ? this.formSimNao.controls['respostaNao'].value : 0;
        this.variavelSelecionado.variavelResposta.exibirOpcaoNao = this.exibirPainel === 1 ? this.chkOpcaoNao : false;
        this.variavelSelecionado.variavelResposta.exibirOpcaoSim = this.exibirPainel === 1 ? this.chkOpcaoSim : false;
        this.variavelSelecionado.variavelResposta.exibirOpcao = this.exibirPainel === 3 ? true : false;
        this.variavelSelecionado.variavelResposta.listaOpcoes = this.exibirPainel === 1 || this.exibirPainel === 3 ? this.listaTodasOpcoes : null;
      }

      this.variavelSelecionado.id = this.variavelSelecionado.id > 0 && this.variavelSelecionado.id !== null ? this.variavelSelecionado.id : null;
      this.variavelSelecionado.nome = this.formVariaveis.controls['nome'].value;
      this.variavelSelecionado.descricao = this.formVariaveis.controls['descricao'].value;
      this.variavelSelecionado.tipo = this.listaTipoVariavel.filter(x => x.value === this.formVariaveis.controls['tipoVariavel'].value)[0].viewValue;
      if (this.formVariaveis.controls['unidadeMedida'].value === 0 || this.formVariaveis.controls['unidadeMedida'].value === '') {
        this.variavelSelecionado.unidade = null;
      }else{
        this.variavelSelecionado.unidade = this.formVariaveis.controls['unidadeMedida'].value != null ? this.listaUnidadeMedida.filter(x => x.value === this.formVariaveis.controls['unidadeMedida'].value)[0].viewValue : null;
      }

      this.variavelSelecionado.variavelBasica = this.labelVarBasica === "Sim" ? true : false;
      this.variavelSelecionado.permiteImportacao = this.labelPermImportacao === "Sim" ? true : false;
      this.variavelSelecionado.multiplaSelecao = this.labelMultiplaSelecao === "Sim" ? true : false;

      if (this.variavelSelecionado.id === 0 || this.variavelSelecionado.id === null) {
        await this.variavelService.inserir(this.variavelSelecionado).subscribe(async response => {
          await PcsUtil.swal().fire({
            title: 'Cadastro de vari??veis',
            text: `Vari??vel ${this.variavelSelecionado.nome} cadastrada`,
            type: 'success',
            showCancelButton: false,
            confirmButtonText: 'Ok',
          }).then((result) => {
            this.loading = false;
            this.router.navigate(['/variaveis']);
          }, error => { this.loading = false });
        }, error => { this.loading = false });
      }
      else {
        await this.variavelService.editar(this.variavelSelecionado).subscribe(async response => {
          await PcsUtil.swal().fire({
            title: 'Altera????o de vari??veis',
            text: `Vari??vel ${this.variavelSelecionado.nome} atualizada`,
            type: 'success',
            showCancelButton: false,
            confirmButtonText: 'Ok',
          }).then((result) => {
            this.loading = false;
            this.router.navigate(['/variaveis']);
          }, error => { this.loading = false });
        }, error => { this.loading = false });
      }
    }
  }

  async validarFormulario() {

    //Variaveis
    let formularioInvalido: boolean = false;
    let listaInvalida: boolean = false;
    let quadradoInvalido: boolean = false;
    let formularioNome: string;
    let listaNome: string;
    let quadradocor: string;

    if (!this.formSimNaoOpcoes.valid && this.exibirPainel === 1) {
      formularioNome = "Tipo sim/n??o com lista de op????es";
      formularioInvalido = true;

    }
    else if (!this.formSimNao.valid && this.exibirPainel === 2) {
      formularioNome = "Tipo sim/n??o";
      formularioInvalido = true;
    }
    else if (!this.formOpcoes.valid && this.exibirPainel === 3) {
      formularioNome = "Tipo lista de op????es";
      formularioInvalido = true;

    }
    else if (!this.formReferencia.valid && this.chkOpcaoReferencia === false && !this.desabilitarOpcaoReferencia) {
      formularioNome = "Refer??ncia";
      formularioInvalido = true;
    }

    else if (this.chkOpcaoSim === false && this.chkOpcaoNao === false && this.exibirPainel === 1) {
      listaNome = "A lista de op????es Sim ou N??o deve ser habilitada";
      listaInvalida = true
    }

    else if (this.chkOpcaoSim === true && this.listaTabelaSimOpcoes.length === 0 && this.exibirPainel === 1) {
      listaNome = "op????es - sim";
      listaInvalida = true;
    }

    else if (this.chkOpcaoNao === true && this.listaTabelaNaoOpcoes.length === 0 && this.exibirPainel === 1) {
      listaNome = "op????es - n??o";
      listaInvalida = true;
    }

    else if (this.listaTabelaOpcoes.length === 0 && this.exibirPainel === 3) {
      listaNome = "op????es";
      listaInvalida = true;
    }

    else if (this.formReferencia.valid && this.chkOpcaoReferencia === false) {
      if (this.formReferencia.controls['deGreen'].value > this.formReferencia.controls['ateGreen'].value) {
        quadradocor = "O valor do campo DE do quadrado verde n??o pode ser maior que o valor do campo AT??, favor verificar";
        quadradoInvalido = true;
      }
      else if (this.formReferencia.controls['deYellow'].value > this.formReferencia.controls['ateYellow'].value) {
        quadradocor = "O valor do campo DE do quadrado amarelo n??o pode ser maior que o valor do campo AT??, favor verificar";
        quadradoInvalido = true;
      }
      else if (this.formReferencia.controls['deOrange'].value > this.formReferencia.controls['ateOrange'].value) {
        quadradocor = "O valor do campo DE do quadrado laranja n??o pode ser maior que o valor do campo AT??, favor verificar";
        quadradoInvalido = true;
      }
      else if (this.formReferencia.controls['deRed'].value > this.formReferencia.controls['ateRed'].value) {
        quadradocor = "O valor do campo DE do quadrado vermelho n??o pode ser maior que o valor do campo AT??, favor verificar";
        quadradoInvalido = true;
      }
    }

    if (formularioInvalido === true) {
      await PcsUtil.swal().fire({
        title: 'Valida????o de formul??rio',
        text: `Formul??rio ${formularioNome.toUpperCase()} apresenta campos com dados inv??lidos, favor verificar!`,
        type: 'warning',
        showCancelButton: false,
        confirmButtonText: 'Ok',
      }).then((result) => {
        this.loading = false;
      }, error => { this.loading = false });
    }

    else if (listaInvalida === true) {
      await PcsUtil.swal().fire({
        title: 'Valida????o de formul??rio',
        text: `Lista de ${listaNome.toUpperCase()} deve ter ao menos um registro`,
        type: 'warning',
        showCancelButton: false,
        confirmButtonText: 'Ok',
      }).then((result) => {
        this.loading = false;
      }, error => { this.loading = false });
    }

    else if (quadradoInvalido === true) {
      await PcsUtil.swal().fire({
        title: 'Valida????o de formul??rio',
        text: `${quadradocor}`,
        type: 'warning',
        showCancelButton: false,
        confirmButtonText: 'Ok',
      }).then((result) => {
        this.loading = false;
      }, error => { this.loading = false });
    }

    this.formularioValido = quadradoInvalido === false && listaInvalida === false && formularioInvalido === false ? true : false;
  }

  getNome() {
    return this.formVariaveis.get('nome').hasError('required') ? 'Campo nome ?? obrigat??rio' :
      this.formVariaveis.get('nome').hasError('minlength') ? 'Campo nome deve conter ao menos 5 d??gitos' :
        this.formVariaveis.get('nome').hasError('maxlength') ? 'Campo nome deve conter no m??ximo 100 d??gitos' : '';
  }

  getDescricao() {
    return this.formVariaveis.get('descricao').hasError('required') ? 'Campo Descri????o ?? obrigat??rio' :
      this.formVariaveis.get('descricao').hasError('minlength') ? 'Campo Descri????o deve conter ao menos 5 d??gitos' :
        this.formVariaveis.get('descricao').hasError('maxlength') ? 'Campo Descri????o deve conter no m??ximo 1000 d??gitos' : '';
  }

  getTipoVariavel() {
    return this.formVariaveis.get('tipoVariavel').hasError('required') ? 'Campo tipo ?? obrigat??rio' : '';
  }

  getRespostaSimOpcao() {
    return this.formSimNaoOpcoes.get('respostaSimOpcao').hasError('required') ? 'Campo resposta Sim ?? obrigat??rio' :
      this.formSimNaoOpcoes.get('respostaSimOpcao').hasError('minlength') ? 'Campo resposta Sim deve conter ao menos 1 d??gitos' :
        this.formSimNaoOpcoes.get('respostaSimOpcao').hasError('maxlength') ? 'Campo resposta Sim deve conter no m??ximo 20 d??gitos' : '';
  }

  getRespostaNaoOpcao() {
    return this.formSimNaoOpcoes.get('respostaNaoOpcao').hasError('required') ? 'Campo resposta N??o ?? obrigat??rio' :
      this.formSimNaoOpcoes.get('respostaNaoOpcao').hasError('minlength') ? 'Campo resposta N??o deve conter ao menos 1 d??gitos' :
        this.formSimNaoOpcoes.get('respostaNaoOpcao').hasError('maxlength') ? 'Campo resposta N??o deve conter no m??ximo 20 d??gitos' : '';
  }

  getRespostaSim() {
    return this.formSimNao.get('respostaSim').hasError('required') ? 'Campo resposta Sim ?? obrigat??rio' :
      this.formSimNao.get('respostaSim').hasError('minlength') ? 'Campo resposta Sim deve conter ao menos 1 d??gitos' :
        this.formSimNao.get('respostaSim').hasError('maxlength') ? 'Campo resposta Sim deve conter no m??ximo 20 d??gitos' : '';
  }

  getRespostaNao() {
    return this.formSimNao.get('respostaNao').hasError('required') ? 'Campo resposta N??o ?? obrigat??rio' :
      this.formSimNao.get('respostaNao').hasError('minlength') ? 'Campo resposta N??o deve conter ao menos 1 d??gitos' :
        this.formSimNao.get('respostaNao').hasError('maxlength') ? 'Campo resposta N??o deve conter no m??ximo 20 d??gitos' : '';
  }

  getOpcaoSim() {
    return this.formSimNaoOpcoes.get('opcaoSim').hasError('required') ? 'Campo op????o ?? obrigat??rio' : '';
  }

  getOpcaoNao() {
    return this.formSimNaoOpcoes.get('opcaoNao').hasError('required') ? 'Campo op????o ?? obrigat??rio' : '';
  }

  getOpcao() {
    return this.formOpcoes.get('opcao').hasError('required') ? 'Campo op????o ?? obrigat??rio' : '';
  }

  getDeGreen() {
    return this.formReferencia.get('deGreen').hasError('required') ? 'Campo De (quadrado verde) ?? obrigat??rio' :
      this.formReferencia.get('deGreen').hasError('minlength') ? 'Campo De (quadrado verde) deve conter ao menos 1 d??gitos' :
        this.formReferencia.get('deGreen').hasError('maxlength') ? 'Campo De (quadrado verde) deve conter no m??ximo 20 d??gitos' : '';
  }

  getAteGreen() {
    return this.formReferencia.get('ateGreen').hasError('required') ? 'Campo At?? (quadrado verde) ?? obrigat??rio' :
      this.formReferencia.get('ateGreen').hasError('minlength') ? 'Campo At?? (quadrado verde) deve conter ao menos 1 d??gitos' :
        this.formReferencia.get('ateGreen').hasError('maxlength') ? 'Campo At?? (quadrado verde) deve conter no m??ximo 20 d??gitos' : '';
  }

  getDeYellow() {
    return this.formReferencia.get('deYellow').hasError('required') ? 'Campo De (quadrado amarelo) ?? obrigat??rio' :
      this.formReferencia.get('deYellow').hasError('minlength') ? 'Campo De (quadrado amarelo) deve conter ao menos 1 d??gitos' :
        this.formReferencia.get('deYellow').hasError('maxlength') ? 'Campo De (quadrado amarelo) deve conter no m??ximo 20 d??gitos' : '';
  }

  getAteYellow() {
    return this.formReferencia.get('ateYellow').hasError('required') ? 'Campo At?? (quadrado amarelo) ?? obrigat??rio' :
      this.formReferencia.get('ateYellow').hasError('minlength') ? 'Campo At?? (quadrado amarelo) deve conter ao menos 1 d??gitos' :
        this.formReferencia.get('ateYellow').hasError('maxlength') ? 'Campo At?? (quadrado amarelo) deve conter no m??ximo 20 d??gitos' : '';
  }

  getDeOrange() {
    return this.formReferencia.get('deOrange').hasError('required') ? 'Campo De (quadrado laranja) ?? obrigat??rio' :
      this.formReferencia.get('deOrange').hasError('minlength') ? 'Campo De (quadrado laranja) deve conter ao menos 1 d??gitos' :
        this.formReferencia.get('deOrange').hasError('maxlength') ? 'Campo De (quadrado laranja) deve conter no m??ximo 20 d??gitos' : '';
  }

  getAteOrange() {
    return this.formReferencia.get('ateOrange').hasError('required') ? 'Campo At?? (quadrado laranja) ?? obrigat??rio' :
      this.formReferencia.get('ateOrange').hasError('minlength') ? 'Campo At?? (quadrado laranja) deve conter ao menos 1 d??gitos' :
        this.formReferencia.get('ateOrange').hasError('maxlength') ? 'Campo At?? (quadrado laranja) deve conter no m??ximo 20 d??gitos' : '';
  }
  getDeRed() {
    return this.formReferencia.get('deRed').hasError('required') ? 'Campo De (quadrado vermelho) ?? obrigat??rio' :
      this.formReferencia.get('deRed').hasError('minlength') ? 'Campo De (quadrado vermelho) deve conter ao menos 1 d??gitos' :
        this.formReferencia.get('deRed').hasError('maxlength') ? 'Campo De (quadrado vermelho) deve conter no m??ximo 20 d??gitos' : '';
  }

  getAteRed() {
    return this.formReferencia.get('ateRed').hasError('required') ? 'Campo At?? (quadrado vermelho) ?? obrigat??rio' :
      this.formReferencia.get('ateRed').hasError('minlength') ? 'Campo At?? (quadrado vermelho) deve conter ao menos 1 d??gitos' :
        this.formReferencia.get('ateRed').hasError('maxlength') ? 'Campo At?? (quadrado vermelho) deve conter no m??ximo 20 d??gitos' : '';
  }
  getReferencia() {
    return this.formReferencia.get('referencia').hasError('required') ? 'Campo Refer??ncia ?? obrigat??rio' :
      this.formReferencia.get('referencia').hasError('minlength') ? 'Campo Refer??ncia deve conter ao menos 1 d??gitos' :
        this.formReferencia.get('referencia').hasError('maxlength') ? 'Campo Refer??ncia deve conter no m??ximo 100 d??gitos' : '';
  }

  blockCaracteresEspeciais(eventKeyCode):boolean{
    return PcsUtil.blockCaracteresEspeciais(eventKeyCode.keyCode);
  }
}
